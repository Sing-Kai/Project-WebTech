var formidable = require('formidable'),
    http = require('http'),
    util = require('util'),
    fs   = require('fs-extra');
 
http.createServer(serve).listen(8080);

function serve(request, response) {
 if (request.url == '/upload' && request.method.toLowerCase() == 'post') {
    var form = new formidable.IncomingForm();

    //writes a reply to the browser
    form.parse(request, function(err, fields, files) {
      response.writeHead(200, {'content-type': 'text/plain'});
      response.write('received upload:\n\n');
      response.end(util.inspect({fields: fields, files: files}));
    });
 
    //logs % upload completion to the console
    form.on('progress', function(bytesReceived, bytesExpected) {
        var percent_complete = (bytesReceived / bytesExpected) * 100;
        console.log(percent_complete.toFixed(2));
    });
    
    //logs errors to the console
    form.on('error', function(err) {
        console.error(err);
    });
 
    //coppies a temp version of the file to the desired directory
    form.on('end', function(fields, files) {
        /* Temporary location of our uploaded file */
        var temp_path = this.openedFiles[0].path;
        /* The file name of the uploaded file */
        var file_name = this.openedFiles[0].name;
        /* Location where we want to copy the uploaded file */
        var new_location = './resources/images/';
 
        fs.copy(temp_path, new_location + file_name, function(err) {  
            if (err) {
                console.error(err);
            } else {
                console.log("success!")
            }
        });
    });
 
    return;
  }
 
  /* Display the file upload form. */
  response.writeHead(200, {'content-type': 'text/html'});
  response.end(
    '<form action="/upload" enctype="multipart/form-data" method="post">'+
    '<input type="text" name="title"><br>'+
    '<input type="file" name="upload" multiple="multiple"><br>'+
    '<input type="submit" value="Upload">'+
    '</form>'
  );
 
}
