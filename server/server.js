var path = Npm.require('path');
var fs = Npm.require('fs');
var base = path.resolve('.');
var isBundle = fs.existsSync(base + '/bundle');

var modelPath = "/opt/local/bin/pdf2htmlEX"

var pdfPath = "/tmp"; //this is where pdf -> html conversion takes place

//Regexp for finding DOI in text, could be useful to retrieve author info from web
//\b(10[.][0-9]{4,}(?:[.][0-9]+)*/(?:(?!["&\'<>])\S)+)\b

JPGs = new Meteor.Collection('jpgs');

HTMLs = new Meteor.Collection('htmls');

Selections = new Meteor.Collection('selections');


  Meteor.methods({
    uploadFile: function (file) {
      var res = file.saveGM('/tmp');
      var convertedfile = EJSON.fromJSONValue(res);
      console.log("FILE_ID: "+convertedfile._id);
      base64Data = new Buffer(convertedfile.data).toString('base64')
      //base64Data = Uint8ToBase64(convertedfile.data);
      convertedfile.data = base64Data;
      JPGs.insert(convertedfile, function(item) {
         
      });

      //---------------------------
      // convert pdf -> html via pdf2htmlEx and add to collection
      var outfile = file._id + ".html";
      var html = pdfToHtml(file.name, outfile);
      var text = fs.readFileSync('/tmp/'+outfile,'utf8')
      //console.log (text)
      HTMLs.insert({"_id": convertedfile._id, "HTML": text}, function(item) {
         console.log("html inserted!");
      });

    }
  });


function pdfToHtml(argument, outfile) {

      //var modulePath = pdfPath;//base + (isBundle ? '/bundle/static' : '/') + pdfPath;
      console.log(argument);



    var Future = Npm.require('fibers/future');

      var fut = new Future();

        var result = null;

        var require = Npm.require;
        var spawn = require('child_process').spawn;
        //var engine = spawn('/bin/ls', [modulePath]);
        var engine = spawn(modelPath, ["--embed-css", "1", "--css-filename", argument + ".css", "--dest-dir", pdfPath, "--embed-javascript", "0",  "--embed-outline", "0", pdfPath +"/" + argument , outfile]);
        var answerBuffer = "";

        engine.stdout.on('data', function(data)
        {
            answerBuffer+=data;
        });

        engine.stderr.on('data', function(data)
        {
            //console.log('stderr: ' + data);
        });

      engine.on('close', function(code)
              {
                  result = "done!" + answerBuffer;//JSON.parse(answerBuffer);
                  console.log('child process exited with code ' + code);

                  fut.return(result);
              });

      return fut.wait();
  
}

