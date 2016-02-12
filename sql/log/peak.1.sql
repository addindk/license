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
),
cte3 AS (
    SELECT login, machine, ip,  log_timestamp::date AS log_date, log_timestamp::time AS log_time, 1 as status2 
    FROM cte2
    WHERE status = 1
    UNION            
    SELECT login, machine, ip, stop::date, stop::time, -1 as status2 
    FROM cte2
    WHERE status = 1        
),
cte4 AS (
    SELECT log_date, @SUM(status2) OVER (PARTITION BY log_date ORDER BY log_date, log_time, status2) AS session_ct
    FROM   cte3
)
SELECT log_date, MAX(session_ct) AS max_sessions
FROM   cte4
GROUP  BY 1
ORDER  BY 1;



