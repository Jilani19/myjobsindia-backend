import { google } from 'googleapis';

export interface IndexingResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  serviceAccountEmail?: string;
  message?: string;
  data?: any;
}

export const notifyGoogleIndexing = async (url: string, type: 'URL_UPDATED' | 'URL_DELETED'): Promise<IndexingResult> => {
  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
    
    if (!serviceAccountJson || serviceAccountJson === '{}') {
      return {
        success: false,
        status: 'SKIPPED',
        message: 'Google Indexing API skipped: GOOGLE_SERVICE_ACCOUNT not configured properly.'
      };
    }

    const credentials = JSON.parse(serviceAccountJson);

    if (!credentials.client_email || !credentials.private_key) {
      return {
        success: false,
        status: 'SKIPPED',
        message: 'Google Indexing API skipped: Missing client_email or private_key in configuration.'
      };
    }

    const auth = new google.auth.JWT(
      credentials.client_email,
      undefined,
      credentials.private_key,
      ['https://www.googleapis.com/auth/indexing'],
      undefined
    );

    const indexing = google.indexing({
      version: 'v3',
      auth: auth
    });

    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: type,
      },
    });

    return {
      success: true,
      status: 'SUCCESS',
      serviceAccountEmail: credentials.client_email,
      message: 'Successfully notified Google Indexing API',
      data: response.data
    };
  } catch (error: any) {
    let errorMessage = error.message;
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error.message;
    }
    
    return {
      success: false,
      status: 'FAILED',
      message: errorMessage || 'Unknown error occurred during indexing'
    };
  }
};
