

function serve(request, response) {
  var form = new formidable.IncomingForm();

  //writes a reply to the browser
  form.parse(request, storeToDB);
 
  //logs % upload completion to the console
  form.on('progress', logProgress);
    
  //logs errors to the console
  form.on('error', function(err) {
    console.error(err);
  });
 
  //coppies a temp version of the file to the desired directory
  form.on('end', storeImage);
}
 
function storeToDB(err, fields, files) {
  console.log(fields.title);
}
  
function logProgress (bytesReceived, bytesExpected) {
  var percent_complete = (bytesReceived / bytesExpected) * 100;
  console.log(percent_complete.toFixed(2));
}

function storeImage(fields, files) {
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
}
