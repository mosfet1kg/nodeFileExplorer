var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    app = express();


app.get('/', function(req, res){
    res.redirect('/get/');
});

app.get('/get/*', function(req,res){

    var tmp_file = '',
        tmp_folder = '',
        ids = req.params,
        dir = '',
        shared_folder = path.join(__dirname, 'shared'),
        list = {};

    dir = path.join( ids[0] );

    if(!fs.statSync( path.join(shared_folder, dir)).isDirectory())
        res.error({err: 'No directory'});

    fs.readdir( path.join( shared_folder, dir), function(err, files){
        if(!!err){
            console.log(err);
            res.error({err:err.message});
        }else{
            var parent = dir != '.' ?  '<a href="/get/' +  path.normalize(path.join(dir,'..'))+'">[..]</a><br/>' : '';

            for(var i in files){
                var file = files[i];

                var stats = fs.statSync(path.join(shared_folder, dir, file) );
                if(stats.isFile()){
                    tmp_file += '<a href="/down/'+path.join(dir,file)+'" download>'+file+'</a><br/>';
                }else{
                    tmp_folder +='<a href="/get/'+path.join(dir,file)+'">['+file+']</a><br/>';
                }
            }

            res.send(parent + tmp_folder + tmp_file );
        }
    });
});

//app.use('/down', express.static(__dirname));
app.get('/down/*', function(req, res){
    var shared_folder = path.join(__dirname, 'shared');
    var file_path = req.params[0];

    res.sendFile( path.join( shared_folder,  file_path ));
});


app.listen(55555, function(){
    console.log('This server server is running on the port ' + this.address().port);
});