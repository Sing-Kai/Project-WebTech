// Run a node.js web server for local development of a static web site.
// Put this program in a site folder and start with "node server.js".
// Then visit the site at the address printed on the console.
// The server is configured to encourage portable web sites.
// In particular, URLs are lower cased so the server is case insensitive even
// on Linux, and paths containing upper case letters are banned so that the
// file system is treated as case sensitive, even on Windows.

// Load the library modules, and define the response codes:
// see http://en.wikipedia.org/wiki/List_of_HTTP_status_codes.
// Define the list of banned urls, and the table of file types, and run tests.
// Then start the server on the given port: use the default 80, or use 8080 to
// avoid privilege or port number clash problems or to add firewall protection.
var http = require('http');
var fs = require('fs-extra');
var formidable = require('formidable');
var Qs = require("querystring");
var OK = 200, NotFound = 404, BadType = 415, Error = 500;
var banned = defineBanned();
var types = defineTypes();
var sql = require("sqlite3");
var db = new sql.Database("article.db");
sql.verbose();
test();
start(8080);

// Start the http service.  Accept only requests from localhost, for security.
// Print out the server address to visit.
function start(port) {
    var httpService = http.createServer(handle);
    httpService.listen(port, 'localhost');
    var address = "http://localhost";
    if (port != 80) address = address + ":" + port;
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
    if (! open(url)) return fail(response, NotFound, "URL has been banned");
    url = resolveAction(request, response, url);
}

function validate(request, response, url){
}

/* New section in server 5 by Ben -----------------------------------------------------*/
//Resolving actions, checking to see if the url dictates an action as opposed to a file ~Ben
function resolveAction(request, response, url) {

    if (url.lastIndexOf(".") > url.lastIndexOf("/")){
      url="/resources"+url;//Directs to the resources folder, protecting anything stored elsewhere
      serve(request, response, url);//Serve if url is a file (has an extension)
    } else {
      var dash = url.lastIndexOf("-");
      if (url.lastIndexOf("-") >= 1){      
        argument = url.substring(dash+1);
        actioncode= url.substring(0,dash);
        console.log("argument ",argument);
        console.log("actioncode ",actioncode);
      } else {
        actioncode= url;
      }
      switch(actioncode){
        case '/create':
          //basic test of function to be removed when we are happy with performance
          console.log('Could call any function we wanted here');           
          url='/resources/images/mind.jpg';
          serve(request, response, url); 
          break;
        case '/submission':
          console.log('form submitted:');
          readForm(request); 
          url='/resources/success.html';
          serve(request, response, url);   
          break;
        case '/article':
          url='/templates/individual_article.html';
          serveIndividual(request, response, url, argument);
          break;
        case '/articles':
          url='/templates/articles.html';
          servearticles(request, response, url);
          break;
        default:
          return fail(response, NotFound, "URL refers to an undefined action");
          break;
      }
    }
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

function getIndividualTemp(response, type, article, url, err, articleBody){
  if (err) return fail(response, NotFound, "Article text not found");
  var file = "."+url;
  fs.readFile(file, 'utf-8', fillIndividualTemp.bind(null, response, type, article, articleBody));
}

function fillIndividualTemp(response, type, article, articleBody, err, template){
  if (err) return fail(response, NotFound, "Article template not found");
  var dbrequest="select * FROM articledetails WHERE datatime='"+article+"'";
  console.log(dbrequest);
  template=template.replace("temp.body",articleBody);
  db.all(dbrequest, showIndividual.bind(null, response, type, template));
}

function showIndividual(response, type, template, err, row){
  if(err) return fail(response, NotFound, "Database access failed");
  template=template.replace("temp.img",row[0].imagename);
  template=template.replace("temp.alt",row[0].imagedesc);
  template=template.replace("temp.title",row[0].headline);
  template=template.replace("temp.descrip",row[0].description);
  deliver(response, type, err, template);	
}

function servearticles(request, response, url) {
  var type = "text/html";
  var file = "." + url;
  type = negotiate(request.headers.accept);
  fs.readFile(file, 'utf-8', fillArticlesTemp.bind(null, response, type));
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
    var body = { text: "" }; //body is initialised as an object with an empty string "text"
    request.on('data', add.bind(null, body));//if some of the form body hasn't yet been read then it calls add to read more of it.
    request.on('end', end.bind(null, body));//when the whole body has been read it calls end which interprets the form body
}

function add(body, chunk) {
    body.text = body.text + chunk.toString();//reads the body of the form submission 'chunk' by 'chunk'adding each new sting to body.text
}

function end(body) {
  var params = Qs.parse(body.text); //converts the body text into an object with the form field names as parameters


/*at the moment we are just writing all the fields from the form to the console*/
  console.log("Headline: ", params.headline); //params.headline is the headline to put in the database
  console.log("Description: ", params.description); //params.description is the article description to put in the database
  console.log("Article: ", params.article);//params.article this is the article content - we might want this to be a document rater than stored in the databas directly.
  console.log("Image: ", params.image);//params.image is the name of the image to put in the database
  console.log("Image Description: ", params.imgdescription);//params.imgdescription is the description of the image to put in the database
  console.log("Owner: ", params.owner);//params.owner this is the field is the checkbox the person submitting has to click to say it's all their own work probably not needed in the database

/*gets the time in miliseconds since since 01/1970 to use as a unique ID*/
  var date = new Date();
  var datetime = date.getTime();
  console.log(datetime);
  fs.writeFile("articles/"+datetime +".txt", params.article);//Needs a way of handling errors, can take two additional optional arguments, encoding and a callback function which takes err
  db.serialize(populate(datetime, params.headline, params.description, params.image, params.imgdescription));

}

// populates database
function populate(key, headline, description, imagename, imagedesc) {
  var ps = db.prepare("insert into articledetails values (?, ?, ?, ?, ?, ?)", err);
  ps.run(key, headline, description, imagename, imagedesc, 'Default User');
  ps.finalize();  
}


/*-------------------------------------------------*/

// error message if sql statement is incorrect
//I'm not very acustomed to error handling -but this seems to be unhandled - looks like it causes whole server to crash if there is an error in reading the database!
function err(e) { if (e) throw e; }

/*-------------------------------------------------------------------------------------*/

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
function open(url) {
    for (var i=0; i<banned.length; i++) {
        var ban = banned[i];
        if (url == ban || ends(ban, "/") && starts(url, ban)) {
            return false;
        }
    }
    return true;
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
   // content=content.replace("<!--temp.1-->"," Duh..");
    //console.log(content);
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

// Avoid delivering the server source file.  Also call banUpperCase.
function defineBanned() {
    var banned = ["/server.js"];
    banUpperCase(".", banned);
    return banned;
}

// Check a folder for files/subfolders with non-lowercase names.  Add them to
// the banned list so they don't get delivered, making the site case sensitive,
// so that it can be moved from Windows to Linux, for example. Synchronous I/O
// is used because this function is only called during startup.  This avoids
// expensive file system operations during normal execution.  A file with a
// non-lowercase name added while the server is running will get delivered, but
// it will be detected and banned when the server is next restarted.
function banUpperCase(folder, banned) {
    var folderBit = 1 << 14;
    var names = fs.readdirSync(folder);
    for (var i=0; i<names.length; i++) {
        var name = names[i];
        var file = folder + "/" + name;
        if (name != name.toLowerCase()) {
            banned.push(file.substring(1));
        }
        var mode = fs.statSync(file).mode;
        if ((mode & folderBit) == 0) continue;
        banUpperCase(file, banned);
    }
}

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
    //check(valid("/x"), false, "filenames must have extensions"); //This does not apply to our setup - extensionless urls refer to actions.
    check(safe("/index.html"), true);
    check(safe("/\n/"), false);
    check(safe("/x y/"), false);
    check(open("/index.html"), true);
    check(open("/server.js"), false);
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
