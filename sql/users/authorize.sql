SELECT password = crypt(${pass}, password) AS test, customer 
FROM users 
WHERE id=${name}