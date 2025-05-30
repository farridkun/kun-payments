const midtransClient = require('midtrans-client');

export const MidtransPayment = new midtransClient.CoreApi({
	isProduction: false,
	serverKey: process.env.MIDTRANS_SERVER_KEY,
	clientKey: process.env.MIDTRANS_CLIENT_KEY,
});
