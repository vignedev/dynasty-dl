# dynasty-dl
Simple downloading tool for Dynasty Scans.
I simply made this because I needed to download some manga for offline times. 
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
The Spinoff! Special 01
  Saved [Doki] New Game! The Spinoff! - Special 01 - Page 00.png
  Saved [Doki] New Game! The Spinoff! - Special 01 - Page 01.png
  Saved [Doki] New Game! The Spinoff! - Special 01 - Page 02.png
  ...
```
The command will create a new folder with the serie's name and in it another folder for the chapters, each named respectively.

#### Specific range
```
$ dynasty-dl https://dynasty-scans.com/series/new_game -c 42-55
The Spinoff! Special 01
  Saved [Doki] New Game! The Spinoff! - Special 01 - Page 00.png
  Saved [Doki] New Game! The Spinoff! - Special 01 - Page 01.png
  Saved [Doki] New Game! The Spinoff! - Special 01 - Page 02.png
  ...
```
It will save the same way as above, however it will only download the specified range.

#### Single chapter
You can either use the URL for a specific chapter or specify it using the URL for the series.
```
$ dynasty-dl https://dynasty-scans.com/series/new_game -c 1
$ dynasty-dl https://dynasty-scans.com/chapters/new_game_ch01
```
However, I recommend you to download it *though the series and specifying the chapter* than the chapter itself.

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