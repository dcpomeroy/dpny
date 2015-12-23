var Minesweeper = function() {
  var ms = {};
  ms.minefield = Minefield;

  ms.init = function() {
    ms.minefield.init();
    $('.js-loading').hide();
  };

  return ms;
};

var KeypressMonitor = (function() {
  var modifiers = {
    shift: 16
  };
  var keyHeld;
  var kp = {};

  $(document).keydown(function(e) {
    keyHeld = e.which;
  });

  $(document).keyup(function(e) {
    if (e.which === keyHeld) {
      keyHeld = undefined;
    }
  });

  kp.shiftHeld = function(){
    return modifiers.shift === keyHeld;
  }

  return kp;
}());

var Minefield = (function(){
  var $minefield =  $("#minefield");
  var minefield = [];
  var mf = {};
  var options = {
    width: 20,
    height: 10,
    mines: 20
  };

  mf.init = function(width, height, mines) {
    if (!setOptions(width, height, mines)) {
      return false;
    }
    createMinefieldUi();
    createMinefieldBacking();
  };

  var setOptions = function(width, height, mines) {
    if (width !== undefined) {
      options.width = width;
    }
    if (height !== undefined) {
      options.height = height;
    }
    if (mines !== undefined) {
      options.mines = mines;
    }
    return options.mines <= options.width * options.height;
  };

  var createMinefieldUi = function() {
    $minefield.empty();
    for (var row = 0; row < options.height; row++) {
      var $minefieldRow = $('<div></div>');
      for (var col = 0; col < options.width; col++) {
        $minefieldRow.append(Mine.new(mf, row, col));
      }
      $minefield.append($minefieldRow);
    }
  };

  var createMinefieldBacking = function() {
    initializeMinefield();
    generateMines();
    generateMineCounts();
  };

  var initializeMinefield = function() {
    minefield = [];
    for (var row = 0; row < options.height; row++) {
      minefield[row] = [];
      for (var col = 0; col < options.width; col++) {
        minefield[row][col] = MineStates.Empty;
      }
    }
  };

  var generateMines = function() {
    for (var m = 0; m < options.mines; m++) {
      var rowCol = indexToRowCol(randomMineIndex());
      var state = minefield[rowCol.row][rowCol.col];
      if (state !== MineStates.Empty) {
        // try again
        m--; continue;
      }
      minefield[rowCol.row][rowCol.col] = MineStates.Mined;
    }
  };

  var generateMineCounts = function() {
    for (var i = 0; i < boardSize(); i++) {
      var rowCol = indexToRowCol(i);
      if (!isMined(rowCol.row, rowCol.col)) {
        minefield[rowCol.row][rowCol.col] = countAdjacentMines(rowCol.row, rowCol.col);
      }
    }
  }

  var isMined = function(row, col) {
    return (minefield[row][col] & MineStates.Mined) !== 0;
  }

  var countAdjacentMines = function(row, col) {
    var adjacent = getAdjacentCells(row, col);
    var count = 0;
    for (var i in adjacent) {
      var a = adjacent[i]
      if (isMined(a.row, a.col)) {
          count++;
      }
    }
    return count;
  };

  var getAdjacentCells = function(row, col) {
    var adjacent = []
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        var checkRow = row + i,
          checkCol = col + j;
        if (minefield[checkRow] !== undefined && 
          minefield[checkRow][checkCol] !== undefined) {
          adjacent.push({row: checkRow, col: checkCol});
        }
      }
    }
    return adjacent;
  };

  var randomMineIndex = function() {
    return Math.floor(Math.random() * boardSize());
  };

  var boardSize = function() {
    return options.width * options.height;
  }

  var indexToRowCol = function(i) {
    return {row: Math.floor(i / options.width), col: i % options.width};
  };

  mf.click = function(row, col, $minebox) {
    if (KeypressMonitor.shiftHeld()) {
      triggerFlag(row, col, $minebox);
    } else {
      triggerBomb(row, col, $minebox)
    }
  };

  var triggerFlag = function(row, col, $minebox) {
    toggleFlagged(row, col);
    updateFlagUi($minebox);
    updateFlagCount();
  };

  var updateFlagCount = function() {
    $('#js-remaining-mines').html(options.mines-countFlags());
  };

  var countFlags = function() {
    var count = 0;
    for (var i = 0; i < boardSize(); i++) {
      var rowCol = indexToRowCol(i);
      if (isFlagged(rowCol.row, rowCol.col)) {
        count++;
      }
    }
    return count;
  }

  var isFlagged = function(row, col) {
    return (minefield[row][col] & MineStates.Flagged) !== 0;
  }

  var triggerBomb = function(row, col, $minebox) {
    if (isFlagged(row, col)) {
      return;
    }
    if (isMined(row, col)) {
      $minebox.addClass('last');
      exposeAll();
    } else {
      exposeAdjacent(row, col);
    }
  };

  var exposeAll = function() {
    for (var i = 0; i < boardSize(); i++) {
      var rowCol = indexToRowCol(i);
      if (isMined(rowCol.row, rowCol.col)) {
        getMine(rowCol.row, rowCol.col).addClass('bombed');
      } else {
        expose(rowCol.row, rowCol.col);
      }
    }
  };

  var exposeAdjacent = function(row, col) {
    if (getMine(row, col).hasClass('exposed')) {
      return;
    }
    expose(row, col);
    if (minefield[row][col] !== MineStates.Empty) {
      return;
    }
    var adjacent = getAdjacentCells(row, col);
    for (var i in adjacent) {
      var a = adjacent[i];
      exposeAdjacent(a.row, a.col);
    }
  };

  var expose = function(row, col) {
    var $mine = getMine(row, col)
    $mine.addClass('exposed');
    var val = minefield[row][col] & 0xF;
    if (val !== MineStates.Empty) {
       $mine.html(val);
    }
  };

  var getMine = function(row, col) {
    return $('#mine-'+row+'-'+col);
  };

  var toggleFlagged = function(row, col) {
    return minefield[row][col] ^= MineStates.Flagged;
  };

  var updateFlagUi = function($minebox) {
    $minebox.toggleClass('flagged');
  };

  return mf;
}(MineStates));

var Mine = (function() {
  var m = {};

  m.new = function(mf, row, col) {
    var $m = $('<div></div>')
      .append(bombIcon())
      .append(flagIcon())
      .addClass('minebox')
      .prop('id', 'mine-'+row+'-'+col);

    $m.click(function() {
      mf.click(row, col, $(this));
    });

    return $m;
  };

  var bombIcon = function() {
    return $('<span class="glyphicon glyphicon-fire bomb" aria-hidden="true"></span>');
  };

  var flagIcon = function() {
    return $('<span class="glyphicon glyphicon-flag flag" aria-hidden="true"></span>');
  };

  return m;
}());

var MineStates = (function(){
  var ms = {};
  ms.Empty = 0;
  // 1-8 reserved for mine counts
  ms.Mined = 1 << 4;
  ms.Flagged = 1 << 5;
  ms.Revealed = 1 << 6;
  return ms;
}());