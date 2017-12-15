# dynasty-dl
Simple downloading tool for Dynasty Scans.
I simply made this because I needed to download some manga for offline times. 

### Features

* Download manga in image and PDF form from DynastyScans
* Allow to specify what chapter to download
* Allow to download specific range of chapters

### Install
Download it from npm.

`$ npm install -g dynasty-dl`

### Usage
You can use the command to download a single chapter, all the chapters or a specific range of chapters. The general usage would be:

`$ dynasty-dl <dynasty-scans URL>`

#### Entire series
To download the entire series, just leave the URL of the series with no chapter parameter.
```
$ dynasty-dl https://dynasty-scans.com/series/new_game

    Downloading: New Game

        > (0/82) New Game ch01: First Time Going To Work
        (2/18) [==================] 100%

        > (1/82) New Game ch02: Odd Senpais
        (8/8) [==================] 11%

        ...
```
The command will create a new folder with the serie's name and in it another folder for the chapters, each named respectively.

#### Specific range
```
$ dynasty-dl https://dynasty-scans.com/series/new_game -c 10-12

    Downloading: New Game

        > (0/3) New Game ch11: Role Model
        (8/8) [========] 100%
        > (1/3) New Game ch12: It's Gotten Busy?
        (8/8) [========] 100%
        > (2/3) New Game ch12.5: Extra: Old Friends
        (15/15) [===============] 100%

  ...
```
It will save the same way as above, however it will only download the specified range.
Chapters are **zero-indexed**. If you need a list of chapters with corresponding indexes, use the `listChapters` or `-C` flag.

#### Single chapter
You can either use the URL for a specific chapter or specify it using the URL for the series.
```
$ dynasty-dl https://dynasty-scans.com/series/new_game -c 0
$ dynasty-dl https://dynasty-scans.com/chapters/new_game_ch01
```
Chapters are **zero-indexed**. If you need a list of chapters with corresponding indexes, use the `listChapters` or `-C` flag.
However, I recommend you to download it *though the series and specifying the chapter index* than the chapter itself.

#### In PDF
To download a chapter, series or a range of chapters, use the paramter '-p'.

The filename will include the chapter range or the chapter name, if it was specified.
```
$ dynasty-dl https://dynasty-scans.com/series/new_game -p

    Downloading: New Game

        > (0/3) New Game ch11: Role Model
        (8/8) [========] 100%
        > (1/3) New Game ch12: It's Gotten Busy?
        (8/8) [========] 100%
        > (2/3) New Game ch12.5: Extra: Old Friends
        (15/15) [===============] 100%

  ...
```
#### Image Conversion for PDFs
Since the library pdfkit doesn't support some PNG files (distorts them during import), they have to be reconverted.

If you with to save time and skip conversion, use the `-noconvert` flag.

That's been done using `pngjs` to ensure compatibility across multiple platforms, however it was slow. However I couldn't cut off `pngjs`, so I added a peer-dependency for `sharp`, which is much faster. If you with to use `sharp`, install it with: 
```
npm i sharp -g
```

## License
Copyright (c) 2017 vignedev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.