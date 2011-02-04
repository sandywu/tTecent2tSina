var OAuth = require('../lib/oauth.js').OAuth,
	METHOD = 'POST',
	APP_KEY = 'e8a5d6aca8b04abf9b7d72e96a14133f',
	APP_SECRET = 'a2284d543b2a5d88c9f5e3ecf4e4f2be';
  

function generateSigner(token, secret) {
	
	return function(parameters) {
		var url = 'http://open.t.qq.com/api/t/add',
			oauth_nonce  = OAuth.nonce(32),
			oauth_timestamp = OAuth.timestamp(),
			accessor = { 'consumerSecret': APP_SECRET, 'tokenSecret': secret},
			message = { 'method': METHOD, 'action': url, 'parameters': OAuth.decodeForm(parameters)},
			config = {
				'version': ['oauth_version', '1.0'],
				'appKey': ['oauth_consumer_key', APP_KEY],
				'token': ['oauth_token', token],
				'timeStamp': ['oauth_timestamp', oauth_timestamp],
				'nonce': ['oauth_nonce', oauth_nonce],
				'oauth_signature_method' : ['oauth_signature_method', 'HMAC-SHA1'],
			};

		for (p in config) {
			message.parameters.push(config[p]);
		}

		OAuth.SignatureMethod.sign(message, accessor);

		var signedUrl = url+ "?" + OAuth.SignatureMethod.normalizeParameters(message.parameters).replace(/oauth_signature/,"oauth_signature="+OAuth.getParameter(message.parameters, "oauth_signature")+"&oauth_signature");

		return signedUrl; 
	}
}

exports.generateSigner = generateSigner
