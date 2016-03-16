/*sets up database - from chapter 4, slide 5 of the web technologies course*/
"use strict";
var sql = require("sqlite3");
sql.verbose();
var db = new sql.Database("test.db");
db.serialize(startup);

function startup() {
  db.run("create table pets (name text, kind text)", err);
  db.run("insert into pets values ('Odie','dog')", err);
  db.run("insert into pets values ('Wanda','fish')", err);
  db.close();
}

function err(e) { if (e) throw e; }
