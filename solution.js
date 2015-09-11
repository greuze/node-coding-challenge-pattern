var split = require('split');
var Transform = require('stream').Transform;
var util = require('util');

// input: a single line of text
// output: 2D array representing a sudoku puzzle
// Output is only written once the puzzle has been created.
// This stream expects the format:
// 1        // number of problems in input
// 2        // size of puzzle
// 1 2 3 4  // puzzle
// 1 2 3 4
// 1 2 3 4
// 1 2 3 4
util.inherits(ProblemStream, Transform);
function ProblemStream () {
    Transform.call(this, { 'objectMode': true });

    this.numProblemsToSolve = null;
    this.puzzleSize = null;
    this.currentPuzzle = null;
}

ProblemStream.prototype._transform = function (line, encoding, processed) {
    if (this.numProblemsToSolve === null) { // handle first line
        this.numProblemsToSolve = +line;
    }
    else if (this.puzzleSize === null) { // start a new puzzle
        this.puzzleSize = (+line) * (+line); // a size of 3 means the puzzle will be 9 lines long
        this.currentPuzzle = [];
    }
    else {
        var numbers = line.match(/\d+/g); // break line into an array of numbers
        this.currentPuzzle.push(numbers); // add a new row to the puzzle
        this.puzzleSize--; // decrement number of remaining lines to parse for puzzle

        if (this.puzzleSize === 0) {
            this.push(this.currentPuzzle); // we've parsed the full puzzle; add it to the output stream
            this.puzzleSize = null; // reset; ready for next puzzle
        }
    }
    processed(); // we're done processing the current line
};

// input: 2D array representing sudoku puzzle
// output: boolean representing if puzzle is solved
util.inherits(SolutionStream, Transform);
function SolutionStream () {
    Transform.call(this, { 'objectMode': true });
}

SolutionStream.prototype._transform = function (problem, encoding, processed) {
    var solution = solve(problem);
    this.push(solution);
    processed();

    function solve (problem) {
        // Get number of rows, columns and max value
        var max = problem.length;

        // Check number of columns and rows
        var wrongRowLength = problem.some(function(row) {
            return row.length !== max;
        });
        if (wrongRowLength) {
            return false;
        }

        // Check values contraints
        var wrongValue = problem.some(function(row) {
            return row.some(function(value) {
                return value < 1 || value > max;
            });
        });
        if (wrongValue) {
            return false;
        }

        // Check that rows have every value different
        var repeatedValueInRow = problem.some(function(row) {
            var uniqueValues = [];
            return row.some(function(value) {
                if (uniqueValues.indexOf(value) !== -1) {
                    return true;
                } else {
                    uniqueValues.push(value);
                    return false;
                }
            });
        });
        if (repeatedValueInRow) {
            return false;
        }

        // Check that comluns have every value different
        var hasRepeatedValueInColumn = function() {
            for (var i = 0; i < max; i++) {
                var uniqueValues = [];
                for (var j = 0; j < max; j++) {
                    var value = problem[j][i];
                    if (uniqueValues.indexOf(value) !== -1) {
                        return true;
                    } else {
                        uniqueValues.push(value);
                    }
                }
            }
            return false;
        };
        if (hasRepeatedValueInColumn()) {
            return false;
        }

        // Check that squares have every value different
        var hasRepeatedValueInSquare = function() {
            var squareSide = Math.sqrt(max);
            for (var i = 0; i < squareSide; i++) {
                for (var j = 0; j < squareSide; j++) {
                    var uniqueValues = [];
                    for (var k = 0; k < squareSide; k++) {
                        for (var l = 0; l < squareSide; l++) {
                            var value = problem[i*squareSide+k][j*squareSide+l];
                            if (uniqueValues.indexOf(value) !== -1) {
                                return true;
                            } else {
                                uniqueValues.push(value);
                            }
                        }
                    }
                }
            }
        };
        if (hasRepeatedValueInSquare()) {
            return false;
        }

        return true;
    }
};

// input: boolean
// output: formatted string: "Case #n: Yes" or "Case #n: No"
util.inherits(FormatStream, Transform);
function FormatStream () {
    Transform.call(this, { 'objectMode': true });

    this.caseNumber = 0;
}

FormatStream.prototype._transform = function (solution, encoding, processed) {
    this.caseNumber++;

    var result = solution ? 'Yes' : 'No';

    var formatted = 'Case #' + this.caseNumber + ': ' + result + '\n';

    this.push(formatted);
    processed();
};

process.stdin.setEncoding('utf8'); // expect text written to stdin

process.stdin
    .pipe(split()) // split input into lines
    .pipe(new ProblemStream()) // transform lines into problem data structures
    .pipe(new SolutionStream()) // solve each problem
    .pipe(new FormatStream()) // format the solution for output
    .pipe(process.stdout); // write solution to stdout
