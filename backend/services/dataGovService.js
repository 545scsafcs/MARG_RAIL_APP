// DataGovService has been deprecated and removed per system specifications.
export const getDataGovStatus = async () => ({ connected: false, status: 'REMOVED', source: 'Local Database' });
export const syncDataGovData = async () => ({ success: true, message: 'Using local dataset.' });
export const testDataGovConnection = async () => ({ connected: false, message: 'Integration disabled.' });
export const normalizeTrainRecord = (r) => r;
