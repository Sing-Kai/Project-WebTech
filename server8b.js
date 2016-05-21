/*
Run a node.js web server for local development of an interactive web site.Put this program in a site folder and start with "node server.js", then visit the site at the address printed on the console.

When run the following actions are carried out:
- Load the library modules, and define the response codes (see http://en.wikipedia.org/wiki/List_of_HTTP_status_codes )
- Define the list of banned urls, and the table of file types
- Open the database, and define the key and certificate for the https (note these are not secure, having been shared publicly on github, and are for testing only)
- Run tests, then start the server on the given port: (using 8080 to avoid privilege or port number clash problems)
 */

var https = require('https');
var fs = require('fs-extra');//copying of files is easier than with vanilla fs
var sql = require("sqlite3");//to run database
var formidable = require('formidable');//enables reading of multi-part forms
var crypto = require('crypto');//for generation of crypto-random numbers

var OK = 200, NotFound = 404, BadType = 415, Error = 500;
var types = defineTypes();
var db = new sql.Database("scienceCollective.db");

/* --- Self signed key and certificate; generated from http://www.selfsignedcertificate.com/; for testing purposes only; for a real certificate if website were made live https://letsencrypt.org/ could be used --- */
var key =
  "-----BEGIN RSA PRIVATE KEY-----\n"+
  "MIIEogIBAAKCAQEArWideleJSjdSBDfmWj/I7keYiBY2zlD7chguEm4X0YhRtdCB\n"+
  "VeGiEDdthxbtM6uabw22uk/lGvkfxuPGZaDNEDOuY8mMK1qxg3+D5uyf8ZROWG/D\n"+
  "XNPxGcG81eRTJHbqyzg4jn932346Raax2wfa352ExEXwMzfTSbFLXvi6QS3+BkMW\n"+
  "aoJ2bIYkut7ve/ldjuQEVqzBagcqXCeg0cNyWIcKTD0VzyyV5ciG9cURnrJD7i4S\n"+
  "BU4GrLqP2qrYVEyR+bUOKEBZzchHS2/jGn8XRrIkP/RmZq5tG2YSMgPDyjOlS+Vm\n"+
  "G0LpiMQfgJQuB9sQo35CVnv2TsR/6HMHjv83PwIDAQABAoIBADHQyuSZfxQ1/ja+\n"+
  "BEvK5SMmqDf4AbiVZRaqwZmDzQ3hlm+fvXf5gMAd3DYhrPTaCFx82RB+4Tc1eB5/\n"+
  "0r/hSOetoRyDiuPtgu9e03qkYXJaA4O+X6YsMKgQkvnzRLtF+j91IDI3hiwlAAKA\n"+
  "V7mvcP4qVzi3SsC7+dPCvf9DfuY4IdwFHWFqAnWBtEvj1q+uOSmO0F6Iwk45NiUT\n"+
  "RhMiMxMcq5FIBtUYwKFSnJx+O1G6GXVTpTvMtdEmeHtUZup0Lmolr8GC/HZAoCYR\n"+
  "16Jz9XIXevPrSDiZn+MPbgWB/ZxQX7/+oSsTVf4vAm1XeIgxBhBa/zF3uVz+DQtv\n"+
  "xRFSD9ECgYEA4V0ELHNZozWz1pklqdGXq0TNnq9+f7lUdqHBAeanYhZPL6QS3+5J\n"+
  "RCGuSamh3C0kGHdbGXcP/J6mBAyz+ve3Wml5YuhACOM3qcUf96XwQ6WJ3w1e5d7Z\n"+
  "ceqnRZMbF71+M/KFzkV47rdc01N3x/WhO3ytzcNZjQNq/6ecf39/tGkCgYEAxPt/\n"+
  "Ud7NEiZhQiFzLs0VaqkpVuGl7ik7mLuzVfZZ3H0gQNRA47iCUY+gYS4Fbsxhg1pB\n"+
  "Hdj2GaO+c6h6RHyr8LPQ+/09tYjTLuZMCO4/Vkz9ZZTWFpgYvpc2MqFGUP8m+yCj\n"+
  "tt5ctZmEjRKAhM5d6rnGcK32oTKORbkYxYiYeWcCgYAKEm8qUWlzKuZDtAqD4XMm\n"+
  "22dZLTy5Fp5YwvfuTtGyR474cRvK2Ep7+glhD2zFe1r+oO74X2LehnSi/7JXiBSw\n"+
  "vMAJFJowC3+kXcQE/GyViWN1DZLtMR2EwtkA+gce84AdcDxcsKwr9xP1+egDjs3K\n"+
  "69KUvKNW8w0oKeSLqjYZ6QKBgF9pckI1qR8hd/qQOTpyG+2OAngS1EyHrFZOlI8O\n"+
  "xHgII5dDOCsVNApNh2GK6RbB6Hm3PdM3Q/0nUxiygoap3J66en+UKk/D9obBBhNN\n"+
  "U2B56kNJ1GkdQt8OXzIm6+hPrpH1PVdWXZGYypuKWrX5P4Ryd6wcl1l9I2yiO11y\n"+
  "zGgBAoGAV2xLf15TAUjyBpfHPLwKamHu3/R1UjW+d9hK+73j3IKY9L3jC5o38cJM\n"+
  "6QgUKU27/89n4xC6RD04EjChz6JBYPnZ8EkkPDeuXn8Ag2bPoQ8Uj0J4Bby5fqPl\n"+
  "p4/YV+28M/bnSaGQorMXshDghv6xZ/b9QYtOXK3tBBBQmvcubgA=\n"+
  "-----END RSA PRIVATE KEY-----\n";

var cert =
  "-----BEGIN CERTIFICATE-----\n"+
  "MIIC+zCCAeOgAwIBAgIJANDV69sk8hBCMA0GCSqGSIb3DQEBBQUAMBQxEjAQBgNV\n"+
  "BAMMCWxvY2FsaG9zdDAeFw0xNjA1MTgxNTU5MjhaFw0yNjA1MTYxNTU5MjhaMBQx\n"+
  "EjAQBgNVBAMMCWxvY2FsaG9zdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC\n"+
  "ggEBAK1onXpXiUo3UgQ35lo/yO5HmIgWNs5Q+3IYLhJuF9GIUbXQgVXhohA3bYcW\n"+
  "7TOrmm8NtrpP5Rr5H8bjxmWgzRAzrmPJjCtasYN/g+bsn/GUTlhvw1zT8RnBvNXk\n"+
  "UyR26ss4OI5/d9t+OkWmsdsH2t+dhMRF8DM300mxS174ukEt/gZDFmqCdmyGJLre\n"+
  "73v5XY7kBFaswWoHKlwnoNHDcliHCkw9Fc8sleXIhvXFEZ6yQ+4uEgVOBqy6j9qq\n"+
  "2FRMkfm1DihAWc3IR0tv4xp/F0ayJD/0ZmaubRtmEjIDw8ozpUvlZhtC6YjEH4CU\n"+
  "LgfbEKN+QlZ79k7Ef+hzB47/Nz8CAwEAAaNQME4wHQYDVR0OBBYEFFhcsSyjG7Ga\n"+
  "lAwW/EZbxeSBLOSjMB8GA1UdIwQYMBaAFFhcsSyjG7GalAwW/EZbxeSBLOSjMAwG\n"+
  "A1UdEwQFMAMBAf8wDQYJKoZIhvcNAQEFBQADggEBAF5tAbPfql37xYE1Py+vi/Kr\n"+
  "sTNIQ/VaDaMJj0LO9y9w2H/fueAJO3rO6iVSSpr3sDLzg8Qa7yVXsF5ymv4Lx3sJ\n"+
  "vDdgSBUEtInDkVaz7i6bD+VccGzVh/mMNlkaPNFSqiDFVBFr4HedPgLZ1rmksats\n"+
  "E2Ie6YcXVo69CKlzfEJ5ATAGjDBxxfn9BGqPIOc2sO9gcwDIEPXAQkoeX7iKN0oS\n"+
  "IaGtt9+jXAgAz/1AGAbC2R97b/ocXsY1Nb0zdw6PLUvlw6+xvHyM2uocTRv4oG34\n"+
  "XCPcuZBZCxsla3/66kZnSXA57Dy2K85g9hxKnQZRraI+V7+sBhHe79lAC7Tm0HA=\n"+
  "-----END CERTIFICATE-----\n";
/*---------------------------------------------------------------------*/

sql.verbose();//for easier debugging of database
test();
start(8080);

// Start the https service.  Accept only requests from localhost (note: this is for security, to avoid accidentally providing external access to host computer during development; can be removed when ready to make site live). Print out the server address to visit.
function start(port) {
    var options = { key: key, cert: cert };
    var httpsService = https.createServer(options, handle);
    httpsService.listen(port, 'localhost');
    var address = "https://localhost";
    if (port != 443) address = address + ":" + port;
    console.log("Server running at", address);
}

// Serve a request.  Process and validate the url, then deliver the file.
function handle(request, response) {
  var url = request.url;
  url = removeQuery(url);
  url = lower(url);
  url = addIndex(url);
  if (! valid(url)) return fail(response, NotFound, "Invalid URL");
  if (! safe(url)) return fail(response, NotFound, "Unsafe URL");
  if (object(url)){
    url="/resources"+url;//Directs to the resources folder
    serve(request, response, url);
  } else if(action(url)){
    url = resolveAction(request, response, url);
  } else {
    console.log(url);    
    return fail(response, NotFound, "URL type not recognised");
  }
}

//Resolving actions
function resolveAction(request, response, url) {
var actioncode = makeActioncode(url);
  switch(actioncode.action){
    case 'login':
      login(request, response);
      break;
    case 'submission':
      console.log('form submitted:');
      readForm(request); 
      url='/resources/success.html';
      serve(request, response, url);   
      break;
    case 'newuser':
      newUser(request);
      url='/resources/new_user_success.html';
      serve(request, response, url);   
      break;
    case 'article':
      url='/templates/individual_article.html';
      serveIndividual(request, response, url, actioncode.argument);
      break;
    case 'articles':
      url='/templates/articles.html';
      servearticles(request, response, url);
      break;
    case 'request':
      console.log(request);
      return fail(response, NotFound, "URL refers to an undefined action");
      break;
    default:
      console.log('oops');
      console.log(request);
      return fail(response, NotFound, "URL refers to an undefined action");
      break;
  }
}

function newUser(request){
  console.log('you clicked create new account updated');
  var newAccount = new formidable.IncomingForm();

  newAccount.parse(request, newUserDB);
}

function newUserDB(err, params, files) {

  db.serialize(populateNewUser(params.username, params.email, params.password));
}

function populateNewUser(username, email, password) {

  var prepstatement = db.prepare("insert into login(email, password, username) values (?, ?, ?)", err);
  prepstatement.run(email, password, username);
  prepstatement.finalize();  
}

//generates a session ID and saves it as a cookie.
function login(request, response){
  const session = crypto.randomBytes(100).toString('hex');//generates a random string to use as a session ID. Converting to hex is a cheat to make it header safe. Very innefficient way of doing things(twice as many bites, same entropy). Better aproaches exist but require more code or installing aditional modules.
  
/* To do: parse form and look up in DB to see if password and email match*/
/* To do: create an expiry date for the cookie so that login is not for ever*/
/* To do: save the session ID to a database table including session ID and User ID*/
/* To do: actually compare cookie with saved sessions before allowing users to submit articles! */
  response.setHeader('Set-Cookie', 'session='+session);
  var url="/resources/login_success.html"
  serve(request, response, url);
}
  

//Checks if the URL is valid for an actioncode and if it is creates the actioncode and arguments
function makeActioncode(url){
  var actioncode={action:undefined, argument:undefined}
  var dash = url.lastIndexOf("-");
  
  if (url.lastIndexOf("-") >= 1){      
    actioncode.argument = url.substring(dash+1);
    actioncode.action = url.substring(1,dash);

  } else {
    actioncode.action = url.substring(1);
  }
  return actioncode;
}

function serve(request, response, url) { 
    var type = findType(url);
    if (type == null) return fail(response, BadType, "File type unsupported");
    if (type == "text/html") type = negotiate(request.headers.accept); 
    reply(response, url, type);
}

function serveIndividual(request, response, url, article){
  var type = "text/html";
  var articleBody ="./articles/"+article+".txt";
  type = negotiate(request.headers.accept);
  fs.readFile(articleBody, 'utf-8', getIndividualTemp.bind(null, response, type, article, url));
}

function servearticles(request, response, url) {
  var type = "text/html";
  var file = "." + url;
  type = negotiate(request.headers.accept);
  fs.readFile(file, 'utf-8', fillArticlesTemp.bind(null, response, type));
}

function getIndividualTemp(response, type, article, url, err, articleBody){
  if (err) return fail(response, NotFound, "Article text not found");
  var file = "."+url;
  fs.readFile(file, 'utf-8', fillIndividualTemp.bind(null, response, type, article, articleBody));
}

function fillIndividualTemp(response, type, article, articleBody, err, template){
  if (err) return fail(response, NotFound, "Article template not found");
  var dbrequest="select * FROM articledetails WHERE datatime='"+article+"'";
  template=template.replace("temp.body",articleBody);
  db.all(dbrequest, showIndividual.bind(null, response, type, template));
}

function showIndividual(response, type, template, err, row){
  if(err) return fail(response, NotFound, "Database access failed");
  template=template.replace("temp.img","images/"+row[0].imagename);
  template=template.replace("temp.alt",row[0].imagedesc);
  template=template.replace("temp.title",row[0].headline);
  template=template.replace("temp.descrip",row[0].description);
  deliver(response, type, err, template);	
}

function fillArticlesTemp(response, type, err, content) {
   if (err) return fail(response, NotFound, "File not found");
   db.all("select * from articledetails order by datatime DESC", show.bind(null, response, type, content));
}

function show(response, type, content, err, row){
  if(err) return fail(response, NotFound, "Database access failed");
  var i =0;
  for(i=0; i<5 && i<row.length; i++){
     var imgLoc ="temp.img" +i;
     var altLoc ="temp.alt" +i;
     var linkaLoc ="temp.linka" +i;
     var linkbLoc ="temp.linkb" +i;
     var titleLoc ="temp.title" +i;
     var descripLoc ="temp.descrip" +i;
     var img ="images/"+row[i].imagename;
     var alt =row[i].imagedesc;
     var link ="article-"+row[i].datatime;
     var title =row[i].headline;
     var descrip =row[i].description;

     content=content.replace(imgLoc,img);
     content=content.replace(altLoc, alt);
     content=content.replace(linkaLoc, link);
     content=content.replace(linkbLoc, link);
     content=content.replace(titleLoc, title);
     content=content.replace(descripLoc, descrip);
   }
   deliver(response, type, err, content);	
}

/*Reading forms ~Ben  --------------------------*/
function readForm(request){
  var form = new formidable.IncomingForm();

  //writes a reply to the browser
  form.parse(request, storeToDB);
 
  //logs % upload completion to the console
  form.on('progress', logProgress);
    
  //logs errors to the console
  form.on('error', err);
 
  //coppies a temp version of the file to the desired directory
  form.on('end', storeImage);
}

function storeToDB(err, params, files) {
/*gets the time in miliseconds since since 01/1970 to use as a unique ID*/
  var date = new Date();
  var datetime = date.getTime();
  console.log(datetime);
  fs.writeFile("articles/"+datetime +".txt", params.article);//Needs a way of handling errors, can take two additional optional arguments, encoding and a callback function which takes err
  db.serialize(populate(datetime, params.headline, params.description, files.image.name, params.imgdescription));

}

function logProgress (bytesReceived, bytesExpected) {
  var percent_complete = (bytesReceived / bytesExpected) * 100;
  console.log(percent_complete.toFixed(2));
}

function storeImage(fields, files) {
  /* Temporary location of our uploaded file */
  var temp_path = this.openedFiles[0].path;
  /* The file name of the uploaded file */
  var file_name = (this.openedFiles[0].name).toLowerCase();
  /* Location where we want to copy the uploaded file */
  var new_location = './resources/images/';
 
  fs.copy(temp_path, new_location + file_name, function(err) {  
    if (err) {
      console.error(err);
    } else {
      console.log("success!")
    }
  });
}

// populates database
function populate(key, headline, description, imagename, imagedesc) {
  var ps = db.prepare("insert into articledetails values (?, ?, ?, ?, ?, ?)", err);
  ps.run(key, headline, description, imagename, imagedesc, 'Default User');
  ps.finalize();  
}

// error message if sql statement is incorrect
//I'm not very acustomed to error handling -but this seems to be unhandled - looks like it causes whole server to crash if there is an error in reading the database!
function err(e) { if (e) throw e; }

// Remove the query part of a url.
function removeQuery(url) {
    var n = url.indexOf('?');
    if (n >= 0){
      url = url.substring(0, n);
    }
    return url;
}

// Make the url lower case, so the server is case insensitive, even on Linux.
function lower(url) {
    return url.toLowerCase();
}

// If the url ends with / add index.html.
function addIndex(url) {
    if (ends(url, '/')) url = url + "index.html";
    return url;
}

// Validate the URL.  It must start with / and not contain /. or // so
// that /../ and /./ and file or folder names starting with dot are excluded.
// Also a final name with no extension is rejected.
function valid(url) {
    if (! starts(url, "/")) return false;
    if (url.indexOf("//") >= 0) return false;
    if (url.indexOf("/.") >= 0) return false;
    if (ends(url, "/")) return true;
    return true;
}

// Restrict the url to visible ascii characters, excluding control characters,
// spaces, and unicode characters beyond ascii.  Such characters aren't
// technically illegal, but (a) need to be escaped which causes confusion for
// users and (b) can be a security risk.
function safe(url) {
    var spaceCode = 32, deleteCode = 127;
    if (url.length > 1000) return false;
    for (var i=0; i<url.length; i++) {
        var code = url.charCodeAt(i);
        if (code > spaceCode && code < deleteCode) continue;
        return false;
    }
    return true;
}

// Protect any resources which shouldn't be delivered to the browser.
/*function open(url) {
    for (var i=0; i<banned.length; i++) {
        var ban = banned[i];
        if (url == ban || ends(ban, "/") && starts(url, ban)) {
            return false;
        }
    }
    return true;
}*/

//Check if url refers to an object or to an action.
function object(url) {
  if (url.lastIndexOf(".") > url.lastIndexOf("/")) return true;
  return false;
}

//Check if url fits the valid pattern for an action.
// e.g. asdfsdafg or afdghd.h123vg43
function action(url) {
 return /^\/[a-z]+(-[a-z 0-9]+)?$/.test(url);
}

// Find the content type to respond with, or undefined.
function findType(url) {
    var dot = url.lastIndexOf(".");
    var extension = url.substring(dot);
    return types[extension];
}

// Do content negotiation, assuming all pages on the site are XHTML and
// suitable for dual delivery.  Check whether the browser claims to accept the
// XHTML type and, if so, use that instead of the HTML type.
function negotiate(accept) {
    var htmlType = "text/html";
    var xhtmlType = "application/xhtml+xml";
    var accepts = accept.split(",");
    if (accepts.indexOf(xhtmlType) >= 0) return xhtmlType;
    else return htmlType;
}

// Read and deliver the url as a file within the site.
function reply(response, url, type) {
    var file = "." + url;
    fs.readFile(file, deliver.bind(null, response, type));
}

// Deliver the file that has been read in to the browser.
function deliver(response, type, err, content) {
    if (err) return fail(response, NotFound, "File not found");
    var typeHeader = { 'Content-Type': type };
    response.writeHead(OK, typeHeader);
    response.write(content);
    response.end();
}

// Give a minimal failure response to the browser
function fail(response, code, text) {
    var textTypeHeader = { 'Content-Type': 'text/plain' };
    response.writeHead(code, textTypeHeader);
    response.write(text, 'utf8');
    response.end();
}

// Check whether a string starts with a prefix, or ends with a suffix.  (The
// starts function uses a well-known efficiency trick.)
function starts(s, x) { return s.lastIndexOf(x, 0) == 0; }
function ends(s, x) { return s.indexOf(x, s.length-x.length) >= 0; }

// The most common standard file extensions are supported.
// Some common non-standard file extensions are explicitly excluded.
// This table is defined using a function rather than just a global variable,
// because otherwise the table would have to appear before calling start().
function defineTypes() {
    return {
    '.html' : 'text/html',    // old browsers only, see negotiate
    '.css'  : 'text/css',
    '.js'   : 'application/javascript',
    '.png'  : 'image/png',
    '.gif'  : 'image/gif',    // for images copied unchanged
    '.jpeg' : 'image/jpeg',   // for images copied unchanged
    '.jpg'  : 'image/jpeg',   // for images copied unchanged
    '.svg'  : 'image/svg+xml',
    '.json' : 'application/json',
    '.pdf'  : 'application/pdf',
    '.txt'  : 'text/plain',
    '.ttf'  : 'application/x-font-ttf',
    '.aac'  : 'audio/aac',
    '.mp3'  : 'audio/mpeg',
    '.mp4'  : 'video/mp4',
    '.webm' : 'video/webm',
    '.ico'  : 'image/x-icon', // just for favicon.ico
    '.xhtml': undefined,      // not suitable for dual delivery, use .html
    '.htm'  : undefined,      // non-standard, use .html
    '.rar'  : undefined,      // non-standard, platform dependent, use .zip
    '.doc'  : undefined,      // non-standard, platform dependent, use .pdf
    '.docx' : undefined,      // non-standard, platform dependent, use .pdf
    }
}

// Test the server's logic, and make sure there's an index file.
function test() {
    check(removeQuery("/index.html?x=1"), "/index.html");
    check(lower("/index.html"), "/index.html");
    check(lower("/INDEX.HTML"), "/index.html");
    check(addIndex("/index.html"), "/index.html");
    check(addIndex("/admin/"), "/admin/index.html");
    check(valid("/index.html"), true);
    check(valid("../x"), false, "urls must start with /");
    check(valid("/x/../y"), false, "urls must not contain /../");
    check(valid("/x//y"), false, "urls must not contain //");
    check(valid("/x/./y"), false, "urls must not contain /./");
    check(valid("/.txt"), false, "urls must not contain /.");
    check(object("/x"), false, "file names must have extensions"); 
    check(action("/articles"),true); 
    check(action("articles"),false,"actions must start with /"); 
    check(action("/2314"),false,"actions may only include lower case letters"); 
    check(action("/article-1463585950520"),true); 
    check(action("/article-123b-123b"),false, "actions may only have one argument"); 
    check(action("/article-Article"),false, "action arguments must be lower case");   
    check(safe("/index.html"), true);
    check(safe("/\n/"), false);
    check(safe("/x y/"), false);
    check(findType("/x.txt"), "text/plain");
    check(findType("/x"), undefined);
    check(findType("/x.abc"), undefined);
    check(findType("/x.htm"), undefined);
    check(negotiate("xxx,text/html"), "text/html");
    check(negotiate("xxx,application/xhtml+xml"), "application/xhtml+xml");
    check(fs.existsSync('./resources/index.html'), true, "site contains no index.html");
}

function check(x, out, message) {
    if (x == out) return;
    if (message) console.log("Test failed:", message);
    else console.log("Test failed: Expected", out, "Actual:", x);
    console.trace();
    process.exit(1);
}
