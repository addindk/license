COPY log
FROM ${file} DELIMITER ';' CSV HEADER;