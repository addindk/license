WITH cte AS (
    SELECT *
    FROM   log
    WHERE  log_timestamp::date >= ${start}::date
    AND    log_timestamp::date  < ${stop}::date 
    AND    product_id = ${product}
    AND    customer_id = ${customer}   
),
cte2 AS (
    SELECT *, MIN(log_timestamp) OVER (PARTITION BY machine ORDER BY log_timestamp ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING) AS stop
    FROM   cte
)
SELECT login, machine, ip, log_timestamp as start, stop 
FROM cte2 
WHERE status = 1
ORDER BY machine, start;