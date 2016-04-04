/*sets up database - from chapter 4, slide 5 of the web technologies course*/
"use strict";
var sql = require("sqlite3");
sql.verbose();
var db = new sql.Database("article.db");
db.serialize(startup);

function startup() {
  db.run("create table articledetails (datatime integer, headline text, description text, article text, imagedesc text, owner integer)", err);
  db.run("insert into articledetails values ('123','dummy headline', 'dummy description', 'dummy article', 'dummy imagege', '1')", err);
  //db.run("insert into pets values ('Wanda','fish')", err);
  db.close();
}

function err(e) { if (e) throw e; }
