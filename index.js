/*
dynasty-dl by vignedev
*/

const https = require('https'),
	cheerio = require('cheerio'),
	fs = require('fs'),
	argv = require('commander'),
	appendix = 'https://dynasty-scans.com',
	path = require('path'),
	pdfkit = require('pdfkit'),
	progress = require('progress'),
	imageSize = require('imagesize')
	jimp = require('jimp') || null

//pdf document, just a storage
var doc
argv
	.arguments('<url>')
	.description('A tool for downloading manga from Dynasty-Scans.\n  NOTE: If you\'re experiencing image corruption in PDFs, try using the -r flag with jimp installed.')
	.option('-c, --chapters <start>-<end>', 'range of chapters or individual chapters', (val) => {return val.split('-').map(Number)})
	.option('-p, --generate_pdf', 'generate a pdf from the images (this deletes the page images)')
	.option('-r, --reconvert', 'reconvert pages into PNG, PDF generation is enabled by default')
	.action((url) => {
		if(argv.chapters && (argv.chapters[1] < argv.chapters[0]))
			throw new Error('End range cannot be bigger than start range!')
		var manga = {
			url: url,
			type: (url.includes('series') ? 'series' : 'chapter'), //assume that the url is okay and dandy.
			chapters: (argv.chapters ? (argv.chapters.length == 1 ? argv.chapters : Array.from({length: (argv.chapters[1]+1 - argv.chapters[0])}, (v, k) => k + argv.chapters[0])) : [])
		}
		startParsing(manga);
	})
	.parse(process.argv)	//process.argv

function startParsing(manga){
	if(argv.reconvert) argv.generate_pdf = true

	if(manga.type == 'series'){
		//find it, parse the chapters and manually download them
		get(manga.url, body => {
			var pBody = cheerio.load(body)
			var mangaInfo = {
				title: pBody('.tag-title > b').text(),
				author: pBody('.tag-title > a').text(),
				chapters: pBody('a.name').map((i, url) => {return {url:appendix+url.attribs.href,name:url.children[0].data}}).toArray()
			}

			//at this point, mangaInfo contains all chapters, filter it if user wants to
			if(manga.chapters.length != 0){
				//get them by indexes
				var filtered = []
				manga.chapters.forEach(cIndex => {
					var cInx = cIndex-1 //because i haven't decided if I wanted them zero-indexed or not.
					if(mangaInfo.chapters[cInx]){
						filtered.push(mangaInfo.chapters[cInx])
					}else{
						throw new Error(`Chapter ${cIndex} not found.`)
					}
				})
				mangaInfo.chapters = filtered
			}

			//Here we have the final mangaInfo, ready to be parsed
			// >checked, everything seems to be working correctly here, onwards to the "download that shit"

			//generate a pdf and pipe it
			if(argv.generate_pdf){
				doc = new pdfkit({autoFirstPage: false})
				doc.pipe(fs.createWriteStream(`${process.cwd()}/${legalize(mangaInfo.title+((argv.chapters) ? (' ch'+argv.chapters[0] + (argv.chapters[1] ? '-'+argv.chapters[1] : '')) : ''))}.pdf`))
			}

			var dir = process.cwd() + '/' + legalize(mangaInfo.title)
			if(!argv.generate_pdf) mkdir(dir)

			var indx = 0;
			function download(){
				if(indx < mangaInfo.chapters.length){
					console.log('\n'+mangaInfo.chapters[indx].name)
					var chapDir = dir + '/' + legalize(mangaInfo.chapters[indx].name)
					if(!argv.generate_pdf) mkdir(chapDir)
					downloadChapter(mangaInfo.chapters[indx].url, false, chapDir, () => {
						indx++; download()
					})
				}else{
					if(argv.generate_pdf) doc.end()
				}
			}
			download()
		})
	}else if(manga.type == 'chapter'){
		downloadChapter(manga.url, true, process.cwd(),() => {
			if(argv.generate_pdf) doc.end()
		})
	}
}

function downloadChapter(chapterURL, singleChapter, dir, cb){
	get(chapterURL, body => {
		var pBody = cheerio.load(body)
		var json = JSON.parse(pBody('body > script').text().match(/\[(.*)\]/)[0])
		var title = null

		if(singleChapter){
			title = pBody('#chapter-title > b').text()
			console.log('\n'+title)
			if(argv.generate_pdf){
				doc = new pdfkit({autoFirstPage: false})
				doc.pipe(fs.createWriteStream(`${process.cwd()}/${legalize(title)}.pdf`))
			}else{
				mkdir(dir+'/'+legalize(title))
				dir += '/'+legalize(title)
			}
		}
		
		var progressBar = new progress('  (:current/:total) [:bar] :percent', {total:json.length})

		var indx = 0
		function download(){
			if(indx < json.length){
				var current = json[indx]
				var filename = legalize(decodeURI(path.basename(current.image)))
				var saveLoc = dir+'/'+filename
				//console.log(`  Saved ${saveLoc}`); indx++; download()	//debug
				if(argv.generate_pdf){
					https.get(appendix+'/'+current.image, res => {
						var dimensions = []
						imageSize(res, (err,dim) => {dimensions = dim})

						var cap = []
						res.on('data', chunk => {cap.push(chunk)})
						res.on('end', () => {
							doc.addPage({size: [dimensions.width,dimensions.height]})
							if(argv.reconvert){
								if(jimp){
									jimp.read(Buffer.concat(cap), (err,image) => {
										if(err) throw err
										image.getBuffer(jimp.MIME_PNG, (err,result) => {
											if(err) throw err
											doc.image(result, 0, 0)
											progressBar.tick()
											indx++
											download();
										})
									})
								}else{
									throw new Error('Jimp is not installed.\nUse npm i jimp -g to install it and try again.\n')
									process.exit(1)
								}
							}else{
								doc.image(Buffer.concat(cap), 0, 0)
								progressBar.tick()
								indx++
								download();
							}
						})
					})
				}else{
					pipe(appendix+'/'+current.image, saveLoc, () => {
						//console.log(`  Saved ${filename}`)
						progressBar.tick()
						indx++
						download(); 
					})
				}/**/
			}else{
				cb()
			}
		}

		download()
	})
}

/* Helper functions */
function mkdir(path){
	if (!fs.existsSync(path))
		fs.mkdirSync(path)
}
function get(url, cb){
	https.get(url, (res) => {
		var capture = ''
		res.on('data', (chunk) => {capture += chunk})
		res.on('end', () => {cb(capture, res.statusCode)})
	})
}

/*function getBuffer(url, cb){
	https.get(url, (res) => {
		var capture = []
		res.on('data', (chunk) => {capture.push(chunk)})
		res.on('end', () => {cb(Buffer.concat(capture), res.statusCode)})
	})
}*/

function pipe(url, path, cb){
	https.get(url, res => {
		res.pipe(fs.createWriteStream(path))
		res.on('end', cb) 
	})
}

// some OS (eg. Windows) don't support those characters, and an error would be thrown when it would accur.
function legalize(text, replacer = ''){
	return text.replace(/\\|\/|:|\*|\?|"|<|>/g, replacer)
}