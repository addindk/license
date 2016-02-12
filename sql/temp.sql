WITH cte1 AS (
  SELECT extract(day from start) as day, start, stop
  FROM   log
  WHERE  product='f988e515-9d46-462b-beae-a119430e74f5'
  AND    "user"='5896b645-bd88-413a-b46a-bf95cee69d22'
  AND    start>='2015-01-01 0:0+0'
  AND    start<'2015-02-01 0:0+0'
  AND    message='Start'
),
cte2 as (
  SELECT lead(start, 1, 'infinity') OVER w < max(stop) OVER w AS range_end,
         day, start, stop,lead(start, 1, 'infinity') OVER w, max(stop) OVER w
  FROM   cte1
  WINDOW w AS (partition by day ORDER BY start)
),
cte3 as(
  select count(*), day, max 
  from cte2 
  --where range_end 
  group by day, max 
  order by day
)
select distinct day, max(count) over(partition by day) from cte3 order by day