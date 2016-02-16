UPDATE users SET password = crypt(${password}, gen_salt('md5')), verification_code = null, verified = ${verified}
WHERE verification_code = ${verification_code}