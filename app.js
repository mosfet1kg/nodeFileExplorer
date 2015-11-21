var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    app = express(),
    engine = require('ejs-mate'),
    bodyParser = require('body-parser');

app.use( express.static( path.join(__dirname, 'public' ) ) )
   .use(bodyParser.urlencoded({ extended: false }))  // parse application/x-www-form-urlencoded
   .use(bodyParser.json());                          // parse application/json

// use ejs-locals for all ejs templates:
app.engine('ejs', engine);
app.set('views',__dirname + '/views');
app.set('view engine', 'ejs'); // so you can render('index')


app.get('/', function(req, res){
    res.redirect('/get/');
});

app.get('/get/*', function(req,res){

    var ids = req.params,
        dir = '',
        shared_folder = path.join(__dirname, 'shared'),
        list_folders = [],
        list_files = [];

    dir = path.join( ids[0] );

    if(!fs.statSync( path.join(shared_folder, dir)).isDirectory())
        res.error({err: 'No directory'});

    fs.readdir( path.join( shared_folder, dir), function(err, files){
        if(!!err){
            console.log(err);
            res.error({err:err.message});
        }else{
            if( dir != '.' )
                list_folders.push({isFolder: true, link: path.normalize( path.join(dir,'..') ), name: '..'});

            for(var i in files){
                var file = files[i];

                var stats = fs.statSync(path.join(shared_folder, dir, file) );
                if(stats.isFile()){
                    list_files.push( {isFolder: false, link: path.join(dir,file), name: file } );
                }else{
                    list_folders.push( {isFolder: true, link:path.join(dir,file), name: file })
                }
            }

            res.render('explore', { list: list_folders.concat(list_files) } );
        }
    });
});

//app.use('/down', express.static(__dirname));
app.get('/down/*', function(req, res){
    var shared_folder = path.join(__dirname, 'shared');
    var file_path = req.params[0];

    res.sendFile( path.join( shared_folder,  file_path ));
});

app.delete('/remove', function(req, res){
    var shared_folder = path.join(__dirname, 'shared'),
        target = path.join( shared_folder, req.body.item );

    var stats = fs.statSync( target );
    if(stats.isFile()){
        fs.unlink(target, function(err){
            if(!!err){
                res.error({success: false})
            }
            res.json({success: true});
        } )
    }else{
        fs.rmdir( target, function(err){
            if(!!err){
                res.error({success: false})
            }
            res.json({success: true});
        } )
    }

    //fs.unlink()
});
app.listen(55555, function(){
    console.log('This server server is running on the port ' + this.address().port);
});