INSERT INTO users(id,name,password,customer)
VALUES(${id},${name},crypt(${password}, gen_salt('md5')),${customer})