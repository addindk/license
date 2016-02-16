SELECT password = crypt(${pass}, password) AS test, customer, role 
FROM users 
WHERE id=${name}