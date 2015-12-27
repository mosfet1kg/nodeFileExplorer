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
                list_folders.push({isFolder: true, link: path.normalize( path.join(dir,'..') ), name: '..', mtime: '---'});

            for(var i in files){
                var file = files[i];

                var stats = fs.statSync(path.join(shared_folder, dir, file) );
                if(stats.isFile()){
                    list_files.push( {isFolder: false, link: path.join(dir,file), name: file, mtime: stats.mtime, size: stats.size>>10} );
                }else{

                    list_folders.push( {isFolder: true, link:path.join(dir,file), name: file, mtime: stats.mtime})
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
var server = app.listen(52273, function(){
    console.log('This server server is running on the port ' + this.address().port);
});


var io = require('socket.io').listen(server);

var Files = [];

app.use(express.static(__dirname));


io.sockets.on('connection', function (socket) {

    socket.on('Start', function (data) { //data contains the variables that we passed through in the html file
        var Name = data['Name'];
        Files[Name] = {  //Create a new Entry in The Files Variable
            FileSize : data['Size'],
            Data     : "",              //buffer
            Downloaded : 0,
            Pathname: data['Pathname']
        };

        var Place = 0;
        try{
            var stat = fs.statSync('Temp/' +  Name);
            if(stat.isFile())
            {
                Files[Name]['Downloaded'] = stat.size;
                Place = stat.size / 524288;
            }
        }
        catch(er){} //It's a New File
        fs.open("Temp/" + Name, "a", 0755, function(err, fd){
            if(err)
            {
                console.log(err);
            }
            else
            {
                Files[Name]['Handler'] = fd; //We store the file handler so we can write to it later
                socket.emit('MoreData', { 'Place' : Place, Percent : 0 });
            }
        });
    });

    socket.on('Upload', function (data){
        var Name = data['Name'];
        Files[Name]['Downloaded'] += data['Data'].length;
        Files[Name]['Data'] += data['Data'];
        if(Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
        {
            fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Written){
                //Get Thumbnail Here
                var readS = fs.createReadStream("Temp/" + Name);
                var writeS = fs.createWriteStream( path.join(__dirname, 'shared', Files[Name]['Pathname'].substring(4), Name) );
                //File[Name]['Pathname'] 은 /get/test_folder 와 같이 경로명에 /get이 붙어있으므로 이를 제거

                readS.pipe(writeS);  //https://groups.google.com/forum/#!msg/nodejs/YWQ1sRoXOdI/3vDqoTazbQQJ

                readS.on('end', function(){
                    //Operation done
                    fs.unlink("Temp/" + Name, function () { //This Deletes The Temporary File

                        socket.emit('Done');
                    });
                });
            });
        }
        else if(Files[Name]['Data'].length > 10485760){ //If the Data Buffer reaches 10MB
            fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, writen){
                Files[Name]['Data'] = ""; //Reset The Buffer
                var Place = Files[Name]['Downloaded'] / 524288;
                var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
                socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
            });
        }
        else
        {
            var Place = Files[Name]['Downloaded'] / 524288;
            var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
            socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
        }
    });


});