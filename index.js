const BASEURL = 'https://dynasty-scans.com'

const fs = require('fs')
const https = require('https')
const cheerio = require('cheerio')
const path = require('path')
const pdfkit = require('pdfkit')
const imageSize = require('imageSize')
const progress = require('progress')

const PNG = require('pngjs').PNG

const argv = require('commander')
	.version(require('./package.json').version)
	.arguments('<url>')
	.description('Simple tool for batch-downloading from Dynasty-Scans. Supports also PDF saving as well as chapter selection.')
	.option('-c, --chapters <a>-<b>', 'Chapter range.')
	.option('-C, --listChapters', 'List all chapters with correct indexes.')
	.option('-o, --output [path]', 'Different output path, defaults to current working directory.')
	.option('-p, --pdf', 'Downloads pdf instead of seperated images.')
	.option('-n, --noconvert', 'Skips PNG to PDF coversion.')
	.parse(process.argv)

if(!argv.args[0]) argv.help()

var config = {
	pdf: argv.pdf,
	outputDir: argv.output || process.cwd()
}

parseManga({
	url: argv.args[0],
	isSeries: argv.args[0].includes('series'),
	chapters: argv.chapters
})

async function parseManga(manga){
	if(manga.isSeries){
		var sBody = cheerio.load(await get(manga.url)), cPath = config.outputDir+'/', doc

		console.log(`\n  ${sBody('.tag-title > b').text()}`)

		var mangaInfo = {
			title: legalize(sBody('.tag-title > b').text()),
			chapters: sBody('a.name').map((i, url) => {
				return {
					url: BASEURL+url.attribs.href,
					name: url.children[0].data
				}
			}).toArray()
		}

		if(argv.listChapters){
			for(var i = 0; i < mangaInfo.chapters.length; i++){
				console.log(`  ${i}: ${mangaInfo.chapters[i].name}`)
			}
			process.exit(0)
		}

		//slice chapters that are needed and stuff
		if(manga.chapters){
			let selection = argv.chapters.split('-')
			if(selection.length == 1){
				mangaInfo.chapters = [mangaInfo.chapters[selection[0]]]
			}else if(selection.length == 2){
				mangaInfo.chapters = mangaInfo.chapters.slice(selection[0], selection[1])
			}
		}

		if(config.pdf){
			doc = new pdfkit({autoFirstPage: false})
			doc.pipe(fs.createWriteStream(cPath+mangaInfo.title+'.pdf'))
		}else{
			cPath += mangaInfo.title+'/'
			mkdir(cPath);
		}
		for(var i = 0; i < mangaInfo.chapters.length; i++){
			let chapter = await downloadChapter(mangaInfo.chapters[i].url)
			if(config.pdf){
				for(var y = 0; y < chapter.images.length; y++){
					let image = chapter.images[y]
					doc.addPage({size: [image.size.width, image.size.height]})
					if(image.size.format == 'png' && argv.noconvert) image.buffer = await reconvertPNG(image.buffer)
					doc.image(image.buffer, 0, 0)
				}
			}else{
				let tPath = cPath+chapter.name+'/'
				mkdir(tPath)
				for(var y = 0; y < chapter.images.length; y++){
					let image = chapter.images[y]
					await write(tPath+path.basename(image.image), image.buffer)
				}
			}
		}
		if(config.pdf) doc.end()
	}else{
		let chapter = await downloadChapter(manga.url)

		let cPath = config.outputDir+'/'
		if(config.pdf){
			var doc = new pdfkit({autoFirstPage: false})
			doc.pipe(fs.createWriteStream(cPath+chapter.name+'.pdf'))
			for(var i = 0; i < chapter.images.length; i++){
				let image = chapter.images[i]
				doc.addPage({size: [image.size.width, image.size.height]})
				if(image.size.format == 'png') image.buffer = await reconvertPNG(image.buffer)
				doc.image(image.buffer, 0, 0)
			}
			doc.end()
		}else{
			mkdir(chapter.name); cPath += chapter.name+'/'
			for(var i = 0; i < chapter.images.length; i++){
				let image = chapter.images[i]
				await write(cPath+path.basename(image.image), image.buffer)
			}
		}
	}
}

function downloadChapter(url){
	return new Promise((resolve, reject) => {
		get(url).then(async body => {
			try{
				var cBody = cheerio.load(body), name = cBody('#chapter-title > b').text()
				var images = JSON.parse(cBody('body > script').html().match(/\[(.*)\]/)[0])
				console.log(`\n  ${name}`)
				var progressBar = new progress('  [:bar] :percent', {
					complete: '=',
					incomplete: ' ',
					width: images.length,
					total: images.length
				})
				for(var i = 0; i < images.length; i++){
					let imgData = await get(BASEURL+images[i].image, true)
					images[i].buffer = imgData.buffer
					images[i].size = imgData.size
					progressBar.tick()
				}
				resolve({
					name: legalize(name),
					images: images
				})
			}catch(err){
				reject(err)
			}
		})
	})
}

/* Helper functions */
function mkdir(path){
	if (!fs.existsSync(path))
		fs.mkdirSync(path)
}

function pipe(url, path){
	return new Promise((resolve, reject) => {
		https.get(url, res => {
			res.pipe(fs.createWriteStream(path))
			res.on('end', resolve)
			res.on('error', reject)
		})
	})
}

// in case we need buffer later on
function get(url, buffer = false){
	return new Promise((resolve, reject) => {
		https.get(url, async res => {
			var size, cap, lURL = url.toLowerCase()
			if(lURL.endsWith('.gif') || lURL.endsWith('.png') || lURL.endsWith('.jpg') || lURL.endsWith('.jpeg')){
				getImageSize(res).then(ssize => {
					size = ssize
				})
			}
			if(buffer){
				cap = []
				res.on('data', chunk => {cap.push(chunk)})
				res.on('end', () => {
					resolve(size ? {buffer: Buffer.concat(cap), size: size}: Buffer.concat(cap))
				})
			}else{
				cap = ''
				res.on('data', chunk => {cap += chunk})
				res.on('end', () => {
					resolve(cap)
					//no point of including size in here, since who in the right mind would download images to string?
				})
			}
		})
	})
}

function getImageSize(stream){
	return new Promise((resolve, reject) => {
		imageSize(stream, (err,res) => {
			if(err) return reject(err)
			resolve(res)
		})
	})
}

// some OS (eg. Windows) don't like them in the path name, so they throw a tantrum
function legalize(text, replacer = ''){
	return text.replace(/\\|\/|:|\*|\?|"|<|>/g, replacer)
}

// okay i might have gone overboard with promises
function write(file, data){
	return new Promise((resolve,reject) => {
		fs.writeFile(file,data, (err) => {
			if(err) return reject(err)
			resolve()
		})
	})
}

function reconvertPNG(buffer){
	return new Promise((resolve,reject) => {
		let png = new PNG()
		png.parse(buffer, (err,data) => {
			if(err) return reject(err)
			let stream = png.pack()
			var cap = []
			stream.on('data', chunk => {cap.push(chunk)})
			stream.on('end', () => {
				resolve(Buffer.concat(cap))
			})
		})
	})
}