const BASEURL = 'https://dynasty-scans.com/'
const CHAPTER_PERMA = 'https://dynasty-scans.com/chapters/'
const JSON_APPENDIX = '.json'

const fs = require('fs')
const https = require('https')
const path = require('path')
const pdfkit = require('pdfkit')
const imageSize = require('imagesize')
const progress = require('progress')
const URL = require('url').URL
const pj = path.join
// for reconverting, implement an opt. dependency for sharp, a
// faster converting engine
const PNG = require('pngjs').PNG
const sharp = safeRequire('sharp')

const argv = require('commander')
	.version(require('./package.json').version)
	.arguments('<url>')
	.description('Simple tool for batch-downloading from Dynasty-Scans. Supports also PDF saving as well as chapter selection.')
	.option('-c, --chapters <a>-<b>', 'Chapter range.')
	.option('-C, --listChapters', 'List all chapters with correct indexes.')
	.option('-o, --output [path]', 'Different output path, defaults to current working directory.')
	.option('-p, --pdf', 'Downloads pdf instead of seperated images.')
	.option('-n, --noconvert', 'Skips PNG to PDF coversion.')
	.option('-v, --verbose', 'Includes progressbar for each GET request and PDF conversion.')
	.parse(process.argv)
if (!argv.args[0]) argv.help()

let config = {
	pdf: argv.pdf ? new pdfkit({ autoFirstPage: false }) : false,
	output: path.resolve(argv.output || process.cwd()),
	verbose: argv.verbose,
}
let tempURL = new URL(argv.args[0])

parseManga({
	url: tempURL.origin + tempURL.pathname,
	isSeries: !argv.args[0].includes('chapters'),
	chapters: argv.chapters
})

async function parseManga(manga) {
	let initialJSON = await get(manga.url + JSON_APPENDIX)
	let main = JSON.parse(initialJSON), name = main.name || main.long_title
	console.log('\n    Downloading: %s\n', name)

	if (config.pdf)
		config.pdf.pipe(fs.createWriteStream(pj(config.output, `${name}.pdf`)))

	if (manga.isSeries && (main.type == 'Series' || main.type == 'Anthology' || main.type == 'Author')) {
		if (argv.listChapters) {
			let hack = 0
			for (var i = 0; i < main.taggings.length; i++) {
				let chapter = main.taggings[i]
				if (typeof (chapter.header) !== 'undefined') {
					if (chapter.header)
						console.log(' >> ', chapter.header) //ignore if is null

					hack++
				} else {
					console.log(`  ${i - hack}\t ${chapter.title}`)
				}
			}
			process.exit(0)
		}
		main.taggings = main.taggings.filter(key => typeof (key.header) === 'undefined')
		if (manga.chapters) {
			let selection = manga.chapters.split('-')
			if (selection.length == 1)
				main.taggings = [main.taggings[selection[0]]]
			else if (selection.length == 2)
				main.taggings = main.taggings.slice(selection[0], parseInt(selection[1]) + 1)
		}

		config.output = pj(config.output, legalize(name)) // so the name of it is {config.output}/{manga_name}/{chapter_name}
		for (var i = 0; i < main.taggings.length; i++) {
			await getChapter(CHAPTER_PERMA + main.taggings[i].permalink + JSON_APPENDIX, false, i, main.taggings.length)
		}
	} else {
		await getChapter(main, true)
	}

	if (config.pdf)
		config.pdf.end()

	async function getChapter(input, fetched = false, current = 0, length = 1) {
		return new Promise(async resolve => {
			let chapter = fetched ? input : JSON.parse(await get(input)), pbar
			console.log('\t> (%d/%d) %s', current, length, chapter.long_title)

			if (!config.pdf)
				await fs.promises.mkdir(pj(config.output, legalize(input.name || ''), legalize(chapter.long_title)), { recursive: true })

			pbar = newProgress(chapter.pages.length) //doesnt really need to be verbosed, actually useful
			for (var y = 0; y < chapter.pages.length; y++) {
				let imageURL = BASEURL + chapter.pages[y].url;

				if (config.pdf) {
					await addPDFpage(imageURL, config.pdf)
				} else {
					await stream(imageURL, pj(
						config.output,
						legalize(input.name || ''),
						legalize(chapter.long_title),
						path.basename(imageURL)
					))
				}
				pbar.tick()
			}
			resolve()
		})
	}
}

function newProgress(total, extra = '') { //cleaner, limits width
	return new progress('\t(:current/:total) [:bar] :percent ' + extra, {
		complete: '=',
		incomplete: '.',
		width: (total <= 20) ? total : 20,
		total: total
	})
}

function safeRequire(name) {
	let found
	try { found = require(name) } catch (e) { }
	return found
}

/* downloading pipelines */
function stream(url, output) {
	return new Promise((resolve, reject) => {
		https.get(url, res => {
			res.pipe((typeof (output) == 'string') ? fs.createWriteStream(output) : output)
			res.on('end', () => resolve(res.statusCode))
			res.on('error', reject)
		})
	})
}
function addPDFpage(url, document) {
	return new Promise((resolve, reject) => {
		https.get(url, res => {
			let length = parseInt(res.headers['content-length']),
				lengthKnown = isNaN(length),
				pbar = config.verbose ? newProgress(lengthKnown ? 1 : length, `GET: ${url}`) : null
			let dim = null, buffer = []
			imageSize(res, (err, resolution) => {
				if (err) throw err
				dim = resolution
			})
			res.on('data', chunk => {
				buffer.push(chunk)
				if (pbar) pbar.tick(lengthKnown ? 0 : chunk.length)
			}).once('end', async () => {
				let image = Buffer.concat(buffer)
				if (dim.format == 'png' && !argv.noconvert) image = await convertImage(image)
				document.addPage({ size: [dim.width, dim.height] })
				document.image(image, 0, 0)
				resolve()
			}).once('error', reject)
		})
	})
}
function convertImage(buffer) {
	return new Promise((resolve, reject) => {
		//if sharp module is present, use it otherwise fallback to pngjs
		if (sharp) {
			sharp(buffer).toBuffer().then(resolve).catch(reject)
		} else {
			let png = new PNG()
			png.parse(buffer, (err, data) => {
				if (err) return reject(err)
				let stream = png.pack()
				var cap = []
				stream.on('data', chunk => { cap.push(chunk) })
				stream.on('end', () => { resolve(Buffer.concat(cap)) })
			})
		}
	})
}
function get(url) {
	return new Promise((resolve, reject) => {
		https.get(url, res => {
			let length = parseInt(res.headers['content-length']),
				lengthKnown = isNaN(length),
				pbar = config.verbose ? newProgress(lengthKnown ? 1 : length, `GET: ${url}`) : null
			let capture = ''
			res.on('data', chunk => {
				capture += chunk
				if (pbar) pbar.tick(lengthKnown ? 0 : chunk.length)
			}).once('end', () => {
				if (pbar && !lengthKnown) pbar.interrupt()
				resolve(capture)	//err.statusCode
			}).once('error', reject)
		})
	})
}

// some OS (eg. Windows) don't like them in the path name, so they throw a tantrum
// also Windows for some reason will create nearly indestructible files/folders if they end with a period
function legalize(text, replacer = '') {
	return text
		.replace(/\\|\/|:|\*|\?|"|<|>/g, replacer)
		.replace(/\.+$/, '')
}