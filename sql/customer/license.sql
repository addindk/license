SELECT a.id, a.name, b.licenses
FROM product a INNER JOIN customer_product b ON a.id=b.product
WHERE b.customer=$1 and b.product=$2