WITH cte AS (
    SELECT *, log_timestamp::date AS log_date, log_timestamp::time AS log_time
    FROM   log
    WHERE  log_timestamp::date >= ${start}::date
    AND    log_timestamp::date  < ${stop}::date 
    AND    product_id = ${product}
    AND    customer_id = ${customer}                         
), 
cte2 AS (
    SELECT log_date, @SUM(status) OVER (PARTITION BY log_date ORDER BY log_date, log_time, status) AS session_ct
    FROM   cte
)
SELECT log_date, MAX(session_ct) AS max_sessions
FROM   cte2
GROUP  BY 1
ORDER  BY 1;


