CREATE TABLE users
(
  id character varying NOT NULL,
  name character varying,
  password character varying,
  customer uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE product
(
  id uuid NOT NULL,
  rev character varying,
  name character varying,
  repository character varying,
  CONSTRAINT product_pkey PRIMARY KEY (id)
);
CREATE TABLE log
(
  id uuid NOT NULL,
  rev character varying,
  login character varying,
  machine character varying,
  message character varying,
  product uuid,
  version character varying,
  "user" uuid,
  "timestamp" timestamp without time zone,
  ip cidr,
  CONSTRAINT log_pkey PRIMARY KEY (id)
);
CREATE TABLE customer_product
(
  customer uuid NOT NULL,
  product uuid NOT NULL,
  licenses integer,
  CONSTRAINT customer_product_pkey PRIMARY KEY (customer, product)
);
CREATE INDEX customer_product_customer_product_idx
  ON customer_product
  USING btree
  (customer, product);

CREATE TABLE customer
(
  id uuid NOT NULL,
  name character varying,
  CONSTRAINT customer_pkey PRIMARY KEY (id)
);
CREATE INDEX customer_id_idx
  ON customer
  USING btree
  (id);


CREATE INDEX log_message_idx
  ON log
  USING btree
  (message COLLATE pg_catalog."default");

-- Index: log_timestamp_idx

-- DROP INDEX log_timestamp_idx;

CREATE INDEX log_timestamp_idx
  ON log
  USING btree
  ("timestamp");

-- Index: log_user_product_idx

-- DROP INDEX log_user_product_idx;

CREATE INDEX log_user_product_idx
  ON log
  USING btree
  ("user", product);

CREATE INDEX product_id_idx
  ON product
  USING btree
  (id);