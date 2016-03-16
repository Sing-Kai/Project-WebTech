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
var fs = require('fs');
var OK = 200, NotFound = 404, BadType = 415, Error = 500;
var banned = defineBanned();
var types = defineTypes();
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
    var type = findType(url);
    if (type == null) return fail(response, BadType, "File type unsupported");
    if (type == "text/html") type = negotiate(request.headers.accept);
    reply(response, url, type);
}

// Remove the query part of a url.
function removeQuery(url) {
    var n = url.indexOf('?');
    if (n >= 0) url = url.substring(0, n);
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
    if (url.lastIndexOf(".") < url.lastIndexOf("/")) return false;
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
    check(valid("/x"), false, "filenames must have extensions");
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
    check(fs.existsSync('./index.html'), true, "site contains no index.html");
}

function check(x, out, message) {
    if (x == out) return;
    if (message) console.log("Test failed:", message);
    else console.log("Test failed: Expected", out, "Actual:", x);
    console.trace();
    process.exit(1);
}

