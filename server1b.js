// Minimal server: display request body, reply to all requests with "OK".
var HTTP = require('http');
var Qs = require("querystring");
start(8080);

// Provide a service to localhost only.
function start(port) {
  var service = HTTP.createServer(handle);
  service.listen(port, 'localhost');
  console.log("Visit localhost:" + port);
}

// Deal with a request.
function handle(request, response) {
  console.log("Method:", request.method);
  console.log("URL:", request.url);
  console.log("Headers:", request.headers);
  request.on('data', add);
  request.on('end', end);
  var body = "";
  function add(chunk) {
      body = body + chunk.toString();
  }
  function end() {
      console.log("Body:", body);
      var params = Qs.parse(body);
      console.log("MyBox: ", params.mybox);
      reply(response);
  }
}

// Send a reply.
function reply(response) {
  var hdrs = { 'Content-Type': 'text/plain' };
  response.writeHead(200, hdrs);
  response.write("OK");
  response.end();
}


