// var Minesweeper = (function() {
//   var ms = {};
//   ms.minefield = Minefield;

//   ms.init = function() {
    
//   };

//   return ms;
// }());

var Minefield = (function(){
  var mfm;
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
    mfm = MinefieldModel;
    mfm.init(options);
    mfvm = MinefieldViewModel;
    mfvm.init(mfm, click);
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
    options.boardSize = function() {
      return options.width * options.height;
    }
    return options.mines <= options.width * options.height;
  };

  var click = function(coor, $minebox) {
    if (KeypressMonitor.shiftHeld()) {
      mfm.toggleFlagged(coor);
    } else if (!mfm.isFlagged(coor)) {
      mfm.revealAdjacent(coor);
    }
  };

  return mf;
}());

var MinefieldModel = (function(){
  var mfm = {};
  var minefield;

  mfm.init = function(opts) {
    mfm.options = opts;
    initializeMinefield();
    generateMines();
    generateMineCounts();
  };

  var initializeMinefield = function() {
    minefield = [];
    for (var row = 0; row < mfm.options.height; row++) {
      minefield[row] = [];
      for (var col = 0; col < mfm.options.width; col++) {
        minefield[row][col] = MineStates.Empty;
      }
    }
  };

  var generateMines = function() {
    for (var m = 0; m < mfm.options.mines; m++) {
      var coor = indexToCoor(randomMineIndex());
      if (!mfm.isEmpty(coor)) {
        // try again
        m--; continue;
      }
      minefield[coor.row][coor.col] = MineStates.Mined;
    }
  };

  var generateMineCounts = function() {
    for (var i = 0; i < mfm.options.boardSize(); i++) {
      setMineCount(indexToCoor(i));
    }
  };

  var setMineCount = function(coor) {
    var val = minefield[coor.row][coor.col];
    var count = countAdjacentMines(coor);
    minefield[coor.row][coor.col] = (val & ~MINECOUNTMASK) | count;
  };

  var countAdjacentMines = function(coor) {
    var adjacent = getAdjacentCells(coor);
    var count = 0;
    for (var i in adjacent) {
      if (mfm.isMined(adjacent[i])) {
          count++;
      }
    }
    return count;
  };

  var getAdjacentCells = function(coor) {
    var adjacent = [];
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        var checkRow = coor.row + i,
          checkCol = coor.col + j;
        if (minefield[checkRow] !== undefined && 
          minefield[checkRow][checkCol] !== undefined) {
          adjacent.push(Coordinate.new(checkRow, checkCol));
        }
      }
    }
    return adjacent;
  };

  var randomMineIndex = function() {
    return Math.floor(Math.random() * mfm.options.boardSize());
  };

  var countFlags = function() {
    var count = 0;
    for (var i = 0; i < mfm.options.boardSize(); i++) {
      if (mfm.isFlagged(indexToCoor(i))) {
        count++;
      }
    }
    return count;
  };

  mfm.revealAdjacent = function(coor) {
    if (hasState(coor, MineStates.Revealed) ||
      hasState(coor, MineStates.Flagged)) {
      return;
    }
    reveal(coor);
    if (mfm.isMined(coor)) {
      exploded = true;
      revealAll();
      return;
    }
    if (mfm.isEmpty(coor)) {
      var adjacent = getAdjacentCells(coor);
      for (var i in adjacent) {
        mfm.revealAdjacent(adjacent[i]);
      }
    }
  };

  var revealAll = function() {
    for (var i = 0; i < mfm.options.boardSize(); i++) {
      var coor = indexToCoor(i);
      if (mfm.isFlagged(coor)) {
        mfm.toggleFlagged(coor);
      }
      reveal(coor);
    }
  };

  var reveal = function(coor) {
    minefield[coor.row][coor.col] |= MineStates.Revealed;
  };

  mfm.isEmpty = function(coor) {
    return !mfm.isMined(coor) && mfm.adjacentMines(coor) === 0;
  };

  mfm.isRevealed = function(coor) {
    return hasState(coor, MineStates.Revealed);
  };

  mfm.isMined = function(coor) {
    return hasState(coor, MineStates.Mined);
  };

  mfm.isFlagged = function(coor) {
    return hasState(coor, MineStates.Flagged);
  };

  mfm.adjacentMines = function(coor) {
    return minefield[coor.row][coor.col] & MINECOUNTMASK;
  }

  var hasState = function(coor, state) {
    return (minefield[coor.row][coor.col] & state) !== 0;
  };

  mfm.toggleFlagged = function(coor) {
    return minefield[coor.row][coor.col] ^= MineStates.Flagged;
  };

  var indexToCoor = function(i) {
    return Coordinate.new(Math.floor(i / mfm.options.width), i % mfm.options.width);
  };

  mfm.allCoors = function() {
    var coors = [];
    for (var row = 0; row < mfm.options.height; row++) {
      for (var col = 0; col < mfm.options.width; col++) {
        coors.push(Coordinate.new(row, col));
      }
    }
    return coors;
  };

  var MINECOUNTMASK = 0xF;

  var MineStates = (function(){
    var ms = {};
    ms.Empty = 0;
    // 1-8 reserved for mine counts
    ms.Mined = 1 << 4;
    ms.Flagged = 1 << 5;
    ms.Revealed = 1 << 6;
    return ms;
  }());

  return mfm;
}());

var MinefieldViewModel = (function() {
  var mfvm = {};
  var mfm;
  var $minefield = $('#minefield')
  var click;

  mfvm.init = function(minefieldModel, clickFunction) {
    mfm = minefieldModel;
    click = clickFunction;
    createMinefieldUi();
    update();
  };

  var createMinefieldUi = function() {
    $minefield.empty();
    for (var row = 0; row < mfm.options.height; row++) {
      var $minefieldRow = $('<div></div>');
      for (var col = 0; col < mfm.options.width; col++) {
        $minefieldRow.append(Mine.new(click, Coordinate.new(row, col)));
      }
      $minefield.append($minefieldRow);
    }
  };

  var getMine = function(coor) {
    return $('#mine-'+coor.row+'-'+coor.col);
  };

  var toggleFlag = function($minebox) {
    $minebox.toggleClass('flagged');
  };

  var Mine = (function() {
    var m = {};

    m.new = function(click, coor) {
      var $m = $('<div></div>')
        .append(bombIcon())
        .append(flagIcon())
        .addClass('minebox')
        .prop('id', 'mine-'+coor.row+'-'+coor.col);

      $m.click(function() {
        click(coor, $(this));
        update(coor);
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

  var update = function(last) {
    var flagCount = 0;
    var revealCount = 0;
    var coors = mfm.allCoors();
    for (var i in coors) {
      var coor = coors[i];
      var $mine = getMine(coor);
      if (mfm.isFlagged(coor)) {
        flagCount++;
        ensureClass($mine, 'flagged');
        continue;
      } else {
        $mine.removeClass('flagged');
      }
      if (!mfm.isRevealed(coor)) {
        continue;
      }
      revealCount++;
      ensureClass($mine, 'revealed');
      if (mfm.isMined(coor)) {
        ensureClass($mine, 'bombed');
        if (last !== undefined && last.row === coor.row && last.col === coor.col) {
          ensureClass($mine, 'last');
        }
        continue;
      }
      if (!mfm.isEmpty(coor)) {
        $mine.html(mfm.adjacentMines(coor));
      }
    }
    $('#js-total-mines').html(mfm.options.mines);
    $('#js-remaining-mines').html(mfm.options.mines - flagCount);
    if (mfm.options.mines + revealCount === mfm.options.boardSize()) {
      $('#js-winner').show();
    }
  };

  var ensureClass = function($el, clazz) {
    if (!$el.hasClass(clazz)) {
      $el.addClass(clazz);
    }
  };

  return mfvm;
}());

var Coordinate = (function() {
  return {
    new: function(row, col) {
      return {row: row, col: col};
    }
  };
}());


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
