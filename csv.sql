select x,
         array_agg(x) over (order by x
                            rows between 1 following
                                     and unbounded following)
    from generate_series(1, 3) as t(x);