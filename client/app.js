var pdfPath = "/tmp"; //this is where pdf -> html conversion takes place

//Regexp for finding DOI in text, could be useful to retrieve author info from web
//\b(10[.][0-9]{4,}(?:[.][0-9]+)*/(?:(?!["&\'<>])\S)+)\b

JPGs = new Meteor.Collection('jpgs');

HTMLs = new Meteor.Collection('htmls');

Selections = new Meteor.Collection('selections');

/*
if(Meteor.isServer) {

  JPGs.remove({});
  HTMLs.remove({});
  Selections.remove({});

}
*/

Files = new Meteor.Collection(null);


Template.fileUpload.events({
    'change input[type=file]': function(e, tmpl) {
        var input = tmpl.find('input[type=file]');
        var files = input.files;
        var file;
        var mFile;

        for (var i = 0; i < files.length; i++) {
            mFile = new MeteorFile(files[i], {
                collection: Files
            });

            Files.insert(mFile, function(i) {
                return function(err, res) {
                    mFile.upload(files[i], "uploadFile");
                }
            }(i));
        }
    }
});

Template.fileUpload.helpers({
    files: function() {
        return Files.find();
    }
});

Template.jpgs.events({
    'click article.post': function(event, temp) {
        event.preventDefault();
        var item = $(event.target);
        console.log(this);

        var docId = this._id;
        var html = HTMLs.findOne({
            '_id': docId
        });
        var iframe = document.getElementsByClassName('htmldocmodalframe')[0];
        //console.log(iframe);
        renderHtmlIntoFrame(iframe, html.HTML);

        var randomval = Math.random();

        //Manage Selections --------------------

        var initializeTextHighlighter = function() {

            var $frameDocument = $('.htmldocmodalframe').contents();
            // Save the docid in DOM so we can retrieve it inside the events below            
            $('.htmldocmodalframe').attr('id', docId);
            $frameDocument.textHighlighter({
                onRemoveHighlight: function(highlight) {
                    return confirm('Do you really want to remove this highlight: "' + $(highlight).text() + '"?');
                },
                onBeforeHighlight: function(range) {

                    return confirm('Do you really want to highlight this text: "' + range + '"?');
                },
                onAfterHighlight: function(highlights, range) {
                    alert('You have selected "' + range + '" and created ' + highlights.length + ' highlight(s)!');
                    var highlighter = $frameDocument.getHighlighter();

                    var jsonStr = highlighter.serializeHighlights();
                    //look if theres already a selection stored in db...
                    var tmpid = $('.htmldocmodalframe', window.parent.document).attr('id');
                    console.log("findone - docid:" + tmpid);
                    var sel = Selections.findOne({
                        _id: tmpid
                    });

                    // if not -> create one...
                    if (sel == undefined) {
                        Selections.insert({
                            _id: tmpid,
                            "data": jsonStr
                        }, function(item) {
                            console.log("selection inserted!");
                        })
                    } else { // otherwise update selection

                        console.log("selection updated!");
                        Selections.update({
                            _id: tmpid
                        }, {
                            $set: {
                                "data": jsonStr
                            }
                        });
                    }

                }
            });
            // Load previously stored selections...
            var sel = Selections.findOne({
                _id: docId
            });
            if (sel) {
                console.log("found a saved selection!");
                var jsonStr = sel.data;
                $frameDocument.getHighlighter().deserializeHighlights(jsonStr);
            }


            $('#color-picker div.color', window.parent.document).click(function() {
                var color = $(this).css('background-color');
                $frameDocument.getHighlighter().setColor(color);
            });

            $frameDocument.on("click", ".highlighted", function() {
                $frameDocument.getHighlighter().removeHighlights(this);
            });

        };

        // test this later... initFrame.apply ($('#iframe').contents(),[]);
        /*
        $('.htmldocmodalframe').load(initializeTextHighlighter, function() {
          alert( "Load was performed." );
        });  // Non-IE*/
        $('.htmldocmodalframe').ready(initializeTextHighlighter); // IE

        //--- Selections

        $('#myDocModal').modal();

    }
});

var renderHtmlIntoFrame = function(obj, HTML) {
    var hd = $.htmlDoc(HTML);
    console.log("renderHtmlIntoFrame");

    //FIXME: This throws an syntax error
    try {
        $(obj).contents().find('html').html(HTML);
    } catch (err) {
        console.log(err.message);
    }


}


Template.htmlframe.HTMLs = function() {
    return HTMLs.find({});
};

Template.html.rendered = function() {
    var obj = this;
    var id = $(this.firstNode).attr('name');

    console.log("What The Fukc!  id:" + id);
    var item = HTMLs.find({
        '_id': id
    });
    item.forEach(function(arg) {

        console.log("lets not do this right now... :renderHtmlIntoFrame(obj.firstNode, arg.HTML);");

    });
}

Template.jpgs.helpers({
    jpgs: function() {
        return JPGs.find();
    },
    size: function() {
        var val = 0; //Math.floor(Math.random() * 2);
        var size = "small";
        switch (val) {
            case 0:
                size = "small";
                break;
            case 1:
                size = "medium";
                break;
            case 2:
                size = "large";
                break;
        }
        return size;
    }
});

Template.fileUploadRow.helpers({
    uploadCompleteClass: function() {
        return this.uploadProgress == 100 ? 'progress-success' : '';
    }
});




//Extend jquery with htmlDoc

(function($) {
    // RegExp that matches opening and closing browser-stripped tags.
    // $1 = slash, $2 = tag name, $3 = attributes
    var matchTag = /<(\/?)(html|head|body|title|base|meta)(\s+[^>]*)?>/ig;
    // Unique id prefix for selecting placeholder elements.
    var prefix = 'hd' + +new Date;
    // A node under which a temporary DOM tree can be constructed.
    var parent;

    $.htmlDoc = function(html) {
        // A collection of "intended" elements that can't be rendered cross-browser
        // with .innerHTML, for which placeholders must be swapped.
        var elems = $();
        // Input HTML string, parsed to include placeholder DIVs. Replace HTML,
        // HEAD, BODY tags with DIV placeholders.
        var htmlParsed = html.replace(matchTag, function(tag, slash, name, attrs) {
            // Temporary object in which to hold attributes.
            var obj = {};
            // If this is an opening tag...
            if (!slash) {
                // Add an element of this name into the collection of elements. Note
                // that if a string of attributes is added at this point, it fails.
                elems = elems.add('<' + name + '/>');
                // If the original tag had attributes, create a temporary div with
                // those attributes. Then, copy each attribute from the temporary div
                // over to the temporary object.
                if (attrs) {
                    $.each($('<div' + attrs + '/>')[0].attributes, function(i, attr) {
                        obj[attr.name] = attr.value;
                    });
                }
                // Set the attributes of the intended object based on the attributes
                // copied in the previous step.
                elems.eq(-1).attr(obj);
            }
            // A placeholder div with a unique id replaces the intended element's
            // tag in the parsed HTML string.
            return '<' + slash + 'div' + (slash ? '' : ' id="' + prefix + (elems.length - 1) + '"') + '>';
        });

        // If no placeholder elements were necessary, just return normal
        // jQuery-parsed HTML.
        if (!elems.length) {
            return $(html);
        }
        // Create parent node if it hasn't been created yet.
        if (!parent) {
            parent = $('<div/>');
        }
        // Create the parent node and append the parsed, place-held HTML.
        parent.html(htmlParsed);
        // Replace each placeholder element with its intended element.
        $.each(elems, function(i) {
            var elem = parent.find('#' + prefix + i).before(elems[i]);
            elems.eq(i).html(elem.contents());
            elem.remove();
        });
        // Return the topmost intended element(s), sans text nodes, while removing
        // them from the parent element with unwrap.
        return parent.children().unwrap();
    };

}(jQuery));