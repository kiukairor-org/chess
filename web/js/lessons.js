/* Lesson content. Step types:
   info    - read and look; { fen, show (square whose moves are dotted), marks, stars, arrows }
   tap     - tap one of `target` squares
   quiz    - multiple choice; `answer` is the index of the right option
   collect - move White's piece(s) to pick up every star and capture every black piece (Black never moves)
   move    - play a move; right when it is in `accept`, or meets `goal`:
             mate | check | capture | any | safe (the piece on `piece` ends on an unattacked square) | noMateIn1
             `reply` is the opponent's answer; `cont` keeps the position from the previous step;
             `also` are fine moves that are simply not the one this lesson practises. */
(function () {
  'use strict';
  var EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var CHAPTERS = [
    { id: 'pieces', title: 'Meet the pieces', blurb: 'The board, and how each piece moves.' },
    { id: 'rules', title: 'Rules of the game', blurb: 'Check, checkmate, draws and the three special moves.' },
    { id: 'tactics', title: 'First tactics', blurb: 'Tricks that win pieces.' },
    { id: 'openings', title: 'Starting a game', blurb: 'What to do in your first moves.' },
    { id: 'endgames', title: 'Finishing a game', blurb: 'Checkmates you can force, and the last pawn.' }
  ];

  var LESSONS = [
    /* ---------------- chapter 1 ---------------- */
    { id: 'board', chapter: 'pieces', title: 'The board', icon: '♜', steps: [
      { type: 'info', fen: EMPTY, marks: ['h1'], text: 'This is the chessboard. It has <b>64 squares</b>, light and dark. Set it up so each player has a <b>light square in the right-hand corner</b>.' },
      { type: 'info', fen: EMPTY, marks: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'], arrows: [['e1', 'e8']], text: 'The lines going up the board are called <b>files</b>. They have letters, from <b>a</b> to <b>h</b>. This is the e-file.' },
      { type: 'info', fen: EMPTY, marks: ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'], arrows: [['a4', 'h4']], text: 'The lines going across are called <b>ranks</b>. They have numbers, from <b>1</b> to <b>8</b>. This is the 4th rank.' },
      { type: 'info', fen: EMPTY, stars: ['e4'], text: 'Every square has a name: its letter, then its number. The star is on <b>e4</b>: the e-file, the 4th rank.' },
      { type: 'tap', fen: EMPTY, target: ['e4'], text: 'Your turn. Tap the square <b>e4</b>.' },
      { type: 'tap', fen: EMPTY, target: ['b7'], text: 'Now tap <b>b7</b>.' },
      { type: 'tap', fen: EMPTY, target: ['h1'], text: 'Tap <b>h1</b>, the light corner square on White’s right.' },
      { type: 'tap', fen: EMPTY, target: ['g5'], text: 'Last one: tap <b>g5</b>.' },
      { type: 'info', fen: START, text: 'This is how every game starts. <b>White always moves first</b>, then the players take turns, one move each.' },
      { type: 'quiz', fen: START, text: 'Who makes the first move in a game of chess?', options: ['White', 'Black', 'Whoever is younger'], answer: 0, explain: 'White always starts.' }
    ] },
    { id: 'rook', chapter: 'pieces', title: 'The rook', icon: '♜', steps: [
      { type: 'info', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', show: 'd4', text: 'The <b>rook</b> looks like a castle tower. It moves in straight lines: up, down, left or right, as far as it likes.' },
      { type: 'collect', fen: '8/8/8/8/8/8/8/R7 w - - 0 1', stars: ['a7', 'g7', 'g2'], text: 'Move the rook to collect all the stars. Tap the rook, then tap where it should go. Or drag it.' },
      { type: 'info', fen: '8/3p4/8/8/3R2p1/8/8/8 w - - 0 1', show: 'd4', text: 'The rook <b>captures</b> by landing on an enemy piece and taking its place. It cannot jump over pieces.' },
      { type: 'collect', fen: '8/3p4/8/8/3R2p1/8/8/8 w - - 0 1', text: 'Capture both black pawns with your rook.' },
      { type: 'quiz', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', text: 'Can a rook move diagonally?', options: ['No, only in straight lines', 'Yes, one square', 'Yes, as far as it likes'], answer: 0, explain: 'Rooks only move along files and ranks.' }
    ] },
    { id: 'bishop', chapter: 'pieces', title: 'The bishop', icon: '♝', steps: [
      { type: 'info', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', show: 'd4', text: 'The <b>bishop</b> moves diagonally, as far as it likes. It cannot jump over pieces.' },
      { type: 'collect', fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', stars: ['e3', 'g5', 'd8', 'a5'], text: 'Collect the stars with your bishop.' },
      { type: 'info', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', show: 'd4', text: 'Did you notice? This bishop only ever touches <b>dark squares</b>. A bishop stays on the colour it starts on for the whole game. Each player gets one of each.' },
      { type: 'collect', fen: '8/8/5p2/8/3B4/2p5/8/8 w - - 0 1', text: 'Capture both black pawns.' },
      { type: 'quiz', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', text: 'A bishop starts on a dark square. Can it ever reach a light square?', options: ['No, never', 'Yes, after two moves', 'Yes, by capturing'], answer: 0, explain: 'Diagonals never change colour, so the bishop cannot either.' }
    ] },
    { id: 'queen', chapter: 'pieces', title: 'The queen', icon: '♛', steps: [
      { type: 'info', fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', show: 'd4', text: 'The <b>queen</b> is the most powerful piece. She moves like a rook <b>and</b> like a bishop: straight or diagonal, as far as she likes.' },
      { type: 'collect', fen: '8/8/8/8/8/8/8/3Q4 w - - 0 1', stars: ['d6', 'g3', 'a3', 'f8'], text: 'Collect the stars with your queen.' },
      { type: 'collect', fen: '2n4r/8/8/8/8/7b/8/Q7 w - - 0 1', text: 'Capture all three black pieces. Can you do it in just three moves?' },
      { type: 'quiz', fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', text: 'Which two pieces does the queen move like?', options: ['Rook and bishop', 'Rook and knight', 'King and pawn'], answer: 0, explain: 'Straight lines like a rook, diagonals like a bishop.' }
    ] },
    { id: 'king', chapter: 'pieces', title: 'The king', icon: '♚', steps: [
      { type: 'info', fen: '8/8/8/8/3K4/8/8/8 w - - 0 1', show: 'd4', text: 'The <b>king</b> moves one square in any direction. He is slow, but he is the most important piece: if your king is trapped, you lose the game.' },
      { type: 'collect', fen: '8/8/8/8/8/8/8/4K3 w - - 0 1', stars: ['d2', 'c3', 'c4', 'd5'], text: 'Walk the king to the stars, one step at a time.' },
      { type: 'info', fen: '8/8/8/8/8/8/r7/4K3 w - - 0 1', show: 'e1', arrows: [['a2', 'h2']], text: 'A king may <b>never step onto a square where he could be captured</b>. The black rook guards the whole 2nd rank, so this king can only move sideways.' },
      { type: 'quiz', fen: '8/8/8/8/3K4/8/8/8 w - - 0 1', text: 'How far can a king move in one turn?', options: ['One square, in any direction', 'Two squares', 'As far as he likes'], answer: 0, explain: 'One square at a time.' }
    ] },
    { id: 'knight', chapter: 'pieces', title: 'The knight', icon: '♞', steps: [
      { type: 'info', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', show: 'd4', text: 'The <b>knight</b> moves in an <b>L shape</b>: two squares in a straight line, then one square to the side.' },
      { type: 'collect', fen: '8/8/8/8/8/8/8/1N6 w - - 0 1', stars: ['c3', 'e4', 'f6'], only: 'n', text: 'Hop the knight to each star.' },
      { type: 'info', fen: '8/8/8/8/8/8/PPP5/1N6 w - - 0 1', show: 'b1', text: 'The knight is the only piece that can <b>jump over</b> other pieces. These pawns do not block it at all.' },
      { type: 'collect', fen: '8/8/5p2/8/4p3/8/PPP5/1N6 w - - 0 1', only: 'n', text: 'Jump out and capture both black pawns with the knight.' },
      { type: 'info', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', show: 'd4', text: 'One more thing: a knight always lands on the <b>opposite colour</b> from where it started.' },
      { type: 'quiz', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', text: 'Which piece can jump over other pieces?', options: ['The knight', 'The queen', 'The rook'], answer: 0, explain: 'Only the knight jumps.' }
    ] },
    { id: 'pawn', chapter: 'pieces', title: 'The pawn', icon: '♟', steps: [
      { type: 'info', fen: '8/8/8/8/8/4P3/8/8 w - - 0 1', show: 'e3', text: 'The <b>pawn</b> moves straight forward, one square at a time. Pawns can never move backwards.' },
      { type: 'info', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', show: 'e2', text: 'On its <b>very first move</b>, a pawn may go forward two squares instead of one.' },
      { type: 'info', fen: '8/8/8/3p1p2/4P3/8/8/8 w - - 0 1', show: 'e4', text: 'Pawns <b>capture differently from how they move</b>: one square diagonally forward. This pawn can take either black pawn, or just step ahead.' },
      { type: 'info', fen: '8/8/8/4p3/4P3/8/8/8 w - - 0 1', marks: ['e5'], text: 'A pawn cannot capture straight ahead. With a piece right in front of it, this pawn is <b>stuck</b>.' },
      { type: 'collect', fen: '8/8/2p5/3p4/8/8/4P3/8 w - - 0 1', stars: ['e4'], text: 'Reach the star, then capture both black pawns.' },
      { type: 'quiz', fen: '8/8/8/3p1p2/4P3/8/8/8 w - - 0 1', text: 'How does a pawn capture?', options: ['One square diagonally forward', 'Straight ahead', 'Sideways'], answer: 0, explain: 'Forward to move, diagonally forward to capture.' }
    ] },

    /* ---------------- chapter 2 ---------------- */
    { id: 'setup', chapter: 'rules', title: 'Setting up', icon: '♟', steps: [
      { type: 'info', fen: START, text: 'Each side starts with <b>16 pieces</b>: 8 pawns, 2 rooks, 2 knights, 2 bishops, a queen and a king.' },
      { type: 'info', fen: START, marks: ['a1', 'h1', 'b1', 'g1', 'c1', 'f1'], text: 'On the back rank, from the outside in: <b>rooks</b> in the corners, <b>knights</b> next to them, then <b>bishops</b>.' },
      { type: 'info', fen: START, marks: ['d1', 'd8'], text: 'The <b>queen goes on her own colour</b>: the white queen on a light square, the black queen on a dark square. The king takes the square beside her.' },
      { type: 'tap', fen: START, target: ['d1'], text: 'Tap the <b>white queen</b>.' },
      { type: 'tap', fen: START, target: ['b8', 'g8'], text: 'Tap a <b>black knight</b>.' },
      { type: 'tap', fen: START, target: ['e8'], text: 'Tap the <b>black king</b>.' },
      { type: 'quiz', fen: START, text: 'How many pawns does each player start with?', options: ['8', '6', '10'], answer: 0, explain: 'One pawn in front of every piece: eight.' }
    ] },
    { id: 'values', chapter: 'rules', title: 'What pieces are worth', icon: '♛', steps: [
      { type: 'info', fen: START, text: 'Some pieces are stronger than others. Players count them in points:<ul class="vals"><li>Pawn <b>1</b></li><li>Knight <b>3</b></li><li>Bishop <b>3</b></li><li>Rook <b>5</b></li><li>Queen <b>9</b></li></ul>The king has no number. Lose him and you lose the game.' },
      { type: 'quiz', fen: START, text: 'Which is worth more: a rook or a bishop?', options: ['The rook (5)', 'The bishop (3)', 'They are equal'], answer: 0, explain: 'A rook is worth 5, a bishop 3.' },
      { type: 'move', fen: '3q4/8/7k/8/p2R3n/8/8/1K6 w - - 0 1', accept: ['d4d8'], text: 'Your rook can capture a pawn, a knight or a queen. <b>Capture the most valuable piece.</b>', wrong: 'That piece is worth less. Which one is worth 9?', ok: 'The queen! Nine points for free.' },
      { type: 'move', fen: '7k/p7/1p6/6n1/8/4B3/8/K7 w - - 0 1', accept: ['e3g5'], text: 'Before you capture, ask: <b>can they take me back?</b> One of these captures is safe and one loses your bishop. Choose the safe one.', wrongFor: { e3b6: 'The pawn on a7 would capture your bishop. You would give 3 points to win 1.' }, wrong: 'Look for a capture.', ok: 'Yes. Nothing protects the knight, so it is free.' },
      { type: 'quiz', fen: START, text: 'You can give up a knight (3) to win a rook (5). Good idea?', options: ['Yes, you gain 2 points', 'No, never give up a knight', 'It makes no difference'], answer: 0, explain: 'Swapping a weaker piece for a stronger one is a good trade.' }
    ] },
    { id: 'check', chapter: 'rules', title: 'Check', icon: '♚', steps: [
      { type: 'info', fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1', arrows: [['e1', 'e8']], text: 'When a king is attacked, we say he is in <b>check</b>. The player must get out of check right away. Nothing else is allowed.' },
      { type: 'info', fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1', text: 'There are three ways out of check:<ul><li><b>Move</b> the king away</li><li><b>Block</b> the attack with another piece</li><li><b>Capture</b> the attacker</li></ul>' },
      { type: 'move', fen: '4r1k1/8/8/8/8/8/8/4K3 w - - 0 1', goal: 'any', text: 'Your king is in check from the rook. <b>Move him</b> to a safe square.', ok: 'Safe! Notice the game would not let you stay on the e-file.' },
      { type: 'move', fen: '4r1k1/8/8/8/8/8/8/2B1K3 w - - 0 1', accept: ['c1e3'], text: 'Check again. This time <b>block it</b>: put your bishop between the rook and your king.', wrong: 'That escapes too, but this time block with the bishop.', ok: 'Blocked. The bishop is your king’s shield.' },
      { type: 'move', fen: '6k1/8/8/8/8/8/4r3/3QK3 w - - 0 1', goal: 'capture', text: 'Check! The rook came too close. <b>Capture it.</b>', wrong: 'Take the rook that is giving check.', ok: 'Gone. Capturing the attacker ends the check.' },
      { type: 'move', fen: '6k1/8/8/8/8/8/8/R5K1 w - - 0 1', goal: 'check', text: 'Now you attack. Move your rook so that it <b>gives check</b> to the black king.', wrong: 'The king is not attacked yet. Aim the rook at him.', ok: 'Check! Black must deal with it at once.' },
      { type: 'quiz', fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1', text: 'Your king is in check. Can you ignore it and play another move?', options: ['No, you must get out of check', 'Yes, if the other move is better', 'Yes, once per game'], answer: 0, explain: 'Leaving your king in check is not allowed.' }
    ] },
    { id: 'checkmate', chapter: 'rules', title: 'Checkmate', icon: '♚', steps: [
      { type: 'info', fen: 'R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', arrows: [['a8', 'g8']], text: '<b>Checkmate</b> means the king is in check and cannot escape: he cannot move away, nothing can block, and nothing can capture the attacker. Checkmate wins the game.' },
      { type: 'move', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', goal: 'mate', text: 'The black king is stuck behind his own pawns. <b>Checkmate him in one move.</b>', wrong: 'The king can still escape. Look at his back rank.', ok: 'Checkmate! His own pawns trapped him.' },
      { type: 'move', fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', goal: 'mate', text: 'Your king helps here. Put the queen right next to the black king, on a square <b>your king protects</b>.', wrong: 'Not checkmate yet. The queen needs to be protected by your king.', ok: 'Checkmate. The king cannot capture a protected queen.' },
      { type: 'move', fen: '7k/R7/8/8/8/8/8/1R4K1 w - - 0 1', goal: 'mate', text: 'One rook already guards the 7th rank. <b>Finish with the other rook.</b>', wrong: 'Close. Which rook can check along the 8th rank?', ok: 'Checkmate with two rooks.' },
      { type: 'move', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', goal: 'mate', text: 'A real game position. Your queen and bishop both aim at the same pawn next to the black king. <b>Find the checkmate.</b>', wrong: 'Look at the pawn on f7. Two of your pieces attack it.', ok: 'Checkmate in four moves. This famous trap is called Scholar’s Mate.' },
      { type: 'quiz', fen: 'R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', text: 'What is the difference between check and checkmate?', options: ['In checkmate the king has no way out', 'Checkmate is check by a queen', 'There is no difference'], answer: 0, explain: 'Check can be escaped. Checkmate cannot.' }
    ] },
    { id: 'stalemate', chapter: 'rules', title: 'Stalemate and draws', icon: '♚', steps: [
      { type: 'info', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', text: 'It is Black’s turn. The king is <b>not in check</b>, but every square he could go to is attacked, and he has no other piece to move. This is <b>stalemate</b>, and the game is a <b>draw</b>: nobody wins.' },
      { type: 'move', fen: '7k/8/4Q1K1/8/8/8/8/8 w - - 0 1', goal: 'mate', text: 'You are winning easily. Do not let it slip into stalemate. <b>Find checkmate in one.</b>', wrong: 'Not checkmate. Give check along the back rank.', ok: 'Checkmate, not stalemate. Always check that the king is attacked.' },
      { type: 'info', fen: '8/8/4k3/8/8/3K4/8/8 w - - 0 1', text: 'A game is also a draw when:<ul><li>neither side has enough pieces left to checkmate, like king against king</li><li>the same position happens three times</li><li>both players agree to a draw</li></ul>' },
      { type: 'quiz', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', text: 'It is your turn. You are not in check, but you have no legal move. What happens?', options: ['Stalemate: the game is a draw', 'You lose', 'You skip your turn'], answer: 0, explain: 'No legal move and no check means stalemate, a draw.' }
    ] },
    { id: 'castling', chapter: 'rules', title: 'Castling', icon: '♜', steps: [
      { type: 'info', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', arrows: [['e1', 'g1'], ['h1', 'f1']], text: '<b>Castling</b> is a special move that tucks your king into safety. The king slides <b>two squares</b> toward a rook, and that rook hops over to stand beside him. It is the only time you move two pieces at once.' },
      { type: 'move', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', accept: ['e1g1'], text: 'Castle on the king’s side: move your <b>king two squares to the right</b>, from e1 to g1. The rook jumps by itself.', wrong: 'To castle, move the king two squares toward the rook: e1 to g1.', ok: 'Castled! Your king is safe behind his pawns and your rook is in the game.' },
      { type: 'move', fen: 'r3kbnr/ppp1pppp/2nq4/3p1b2/3P1B2/2NQ4/PPP1PPPP/R3KBNR w KQkq - 6 5', accept: ['e1c1'], text: 'You can castle on the queen’s side too. Move your <b>king two squares to the left</b>, from e1 to c1.', wrong: 'Move the king from e1 to c1.', ok: 'That is castling long.' },
      { type: 'info', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', text: 'You may castle only when:<ul><li>the king and that rook have <b>not moved yet</b></li><li>the squares between them are <b>empty</b></li><li>the king is <b>not in check</b>, and does not pass over or land on an attacked square</li></ul>' },
      { type: 'quiz', fen: '4k3/8/8/8/1b6/8/8/R3K2R w KQ - 0 1', arrows: [['b4', 'e1']], text: 'The black bishop is giving check. Can White castle right now?', options: ['No, you cannot castle out of check', 'Yes, on either side', 'Only on the queen’s side'], answer: 0, explain: 'A king in check may not castle. He has to deal with the check first.' },
      { type: 'quiz', fen: '4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1', arrows: [['f8', 'f1']], text: 'The black rook attacks the square f1. Can White castle on the king’s side, toward h1?', options: ['No, the king would pass over an attacked square', 'Yes, the king is not in check', 'Yes, because the rook protects him'], answer: 0, explain: 'The king may not cross an attacked square. Castling the other way is fine.' }
    ] },
    { id: 'enpassant', chapter: 'rules', title: 'En passant', icon: '♟', steps: [
      { type: 'info', fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', marks: ['e5', 'd7'], text: '<b>En passant</b> is French for “in passing”. It is a special pawn capture. Your pawn has reached the 5th rank, and the black pawn next door has not moved yet.' },
      { type: 'info', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', arrows: [['d7', 'd5']], text: 'Black moves that pawn <b>two squares</b>, landing right beside yours, as if sneaking past.' },
      { type: 'move', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', accept: ['e5d6'], text: 'You may capture it <b>as if it had moved only one square</b>. Move your pawn diagonally to d6.', wrong: 'Move the pawn from e5 diagonally to d6.', ok: 'Captured in passing! The black pawn disappears even though you did not land on it.' },
      { type: 'info', fen: '4k3/8/8/5Pp1/8/8/8/4K3 w - g6 0 1', arrows: [['g7', 'g5']], text: 'Two rules: only a <b>pawn</b> can capture en passant, and only on the <b>very next move</b>. Wait one turn and the chance is gone.' },
      { type: 'move', fen: '4k3/8/8/5Pp1/8/8/8/4K3 w - g6 0 1', accept: ['f5g6'], text: 'Black has just played the pawn from g7 to g5. <b>Capture it en passant.</b>', wrong: 'Your pawn on f5 captures diagonally to g6.', ok: 'Exactly right.' },
      { type: 'quiz', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', text: 'When are you allowed to capture en passant?', options: ['Only straight after the enemy pawn moves two squares', 'Any time two pawns stand side by side', 'Only once per game'], answer: 0, explain: 'It must be the very next move.' }
    ] },
    { id: 'promotion', chapter: 'rules', title: 'Promotion', icon: '♛', steps: [
      { type: 'info', fen: '8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', arrows: [['e7', 'e8']], text: 'When a pawn reaches the far end of the board, it is <b>promoted</b>: you swap it for a queen, rook, bishop or knight. Nearly always, you pick a <b>queen</b>.' },
      { type: 'move', fen: '8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', accept: ['e7e8q'], text: 'Push your pawn to the last rank and <b>choose a queen</b>.', wrongFor: { e7e8r: 'A rook is allowed, but the queen is stronger. Try again.', e7e8b: 'A bishop is allowed, but the queen is far stronger. Try again.', e7e8n: 'A knight is allowed, but here the queen is best. Try again.' }, wrong: 'Push the pawn from e7 to e8.', ok: 'A new queen! One point became nine.' },
      { type: 'move', fen: '8/3k1P1q/8/8/8/8/8/4K3 w - - 0 1', accept: ['f7f8n'], text: 'Very rarely another piece is better. Here a <b>knight</b> on f8 would give check <b>and</b> attack the black queen. Promote to a knight.', wrongFor: { f7f8q: 'A queen is good, but a knight is even better here: it attacks king and queen together.' }, wrong: 'Push the pawn to f8 and choose the knight.', ok: 'Check! And the queen is attacked too.', reply: 'd7e7' },
      { type: 'move', cont: true, accept: ['f8h7'], text: 'The king had to move. Now <b>take the queen</b>.', wrong: 'Your knight can capture the queen on h7.', ok: 'A pawn turned into a knight and won a queen.' },
      { type: 'quiz', fen: '8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', text: 'You still have your first queen. Can you promote a pawn to a second queen?', options: ['Yes, you can have several queens', 'No, only one queen each', 'Only if you lost a rook'], answer: 0, explain: 'There is no limit. Nine queens is possible, in theory.' }
    ] },

    /* ---------------- chapter 3 ---------------- */
    { id: 'safety', chapter: 'tactics', title: 'Attack and defend', icon: '♞', steps: [
      { type: 'info', fen: '4k3/pp3ppp/8/3b4/8/2N5/PP3PPP/4K3 w - - 0 1', arrows: [['c3', 'd5']], text: 'Most beginner games are decided by one thing: a piece left where it can be taken for free. Players say that piece is <b>hanging</b>.' },
      { type: 'move', fen: '4k3/pp3ppp/8/3b4/8/2N5/PP3PPP/4K3 w - - 0 1', accept: ['c3d5'], text: 'Nothing protects the black bishop. <b>Take it.</b>', wrong: 'Your knight can capture the bishop on d5.', ok: 'Three free points.' },
      { type: 'move', fen: '4k3/pp3ppp/8/8/3p4/2N5/PP3PPP/4K3 w - - 0 1', goal: 'safe', piece: 'c3', text: 'Now your knight is the one in danger: a pawn attacks it. <b>Move the knight to a safe square.</b>', wrong: 'Your knight can still be captured. Move it somewhere no black piece attacks.', ok: 'Safe. Before every move, ask: is anything of mine attacked?' },
      { type: 'move', fen: '4k3/5ppp/8/8/1b6/8/PP3PPP/R3K3 w - - 0 1', goal: 'any', text: 'Check from the bishop. Get out of check any way you like. Then remember the two questions for every turn: <b>what is attacked, and what is unprotected?</b>', ok: 'Good. Those two questions win a lot of games.' },
      { type: 'quiz', fen: '4k3/pp3ppp/8/3b4/8/2N5/PP3PPP/4K3 w - - 0 1', text: 'What is a “hanging” piece?', options: ['A piece that can be captured for free', 'A piece on the edge of the board', 'A piece that has not moved'], answer: 0, explain: 'Attacked and not protected: hanging.' }
    ] },
    { id: 'fork', chapter: 'tactics', title: 'The fork', icon: '♞', steps: [
      { type: 'info', fen: 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1', arrows: [['c7', 'e8'], ['c7', 'a8']], text: 'A <b>fork</b> is one piece attacking two things at once. Your opponent can only save one of them. Knights are the best forkers.' },
      { type: 'move', fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', accept: ['b5c7'], text: 'Find the square where your knight checks the king <b>and</b> attacks the rook.', wrongFor: { b5d6: 'That is check, but it attacks nothing else. Find the square that also hits the rook.' }, wrong: 'Look for a knight move that attacks the king and the rook together.', ok: 'Fork! The king must move, and the rook is yours.', reply: 'e8e7' },
      { type: 'move', cont: true, accept: ['c7a8'], text: 'The king stepped away. <b>Collect the rook.</b>', wrong: 'Capture the rook on a8.', ok: 'Five points won with one clever jump.' },
      { type: 'move', fen: '4k3/8/8/2n1n3/8/3P4/8/7K w - - 0 1', accept: ['d3d4'], text: 'Even a pawn can fork. Push your pawn so that it <b>attacks both knights</b>.', wrong: 'Move the pawn one square forward.', ok: 'Two knights attacked by a single pawn. One of them will fall.' },
      { type: 'move', fen: '6k1/8/8/r7/8/8/8/3Q2K1 w - - 0 1', accept: ['d1d8'], text: 'Queens fork too. Find a <b>check</b> that also attacks the rook. Careful: one of the checks loses your queen.', wrongFor: { d1d5: 'It is a fork, but the rook simply captures your queen on d5.', d1g4: 'Check, but the rook is not attacked.' }, wrong: 'Look for a check from far away that also lines up with the rook.', ok: 'Check and an attack on the rook.', reply: 'g8g7' },
      { type: 'move', cont: true, accept: ['d8a5'], text: 'Now <b>take the rook</b>.', wrong: 'The rook on a5 is free.', ok: 'That is a queen fork.' },
      { type: 'quiz', fen: 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1', text: 'What is a fork?', options: ['One piece attacking two things at once', 'Two pieces attacking one thing', 'A pawn reaching the last rank'], answer: 0, explain: 'One attacker, two targets.' }
    ] },
    { id: 'pin', chapter: 'tactics', title: 'The pin', icon: '♝', steps: [
      { type: 'info', fen: '4k3/pp3ppp/2n5/1B6/8/8/PP3PPP/4K3 b - - 0 1', arrows: [['b5', 'e8']], text: 'A <b>pin</b> freezes a piece. Your bishop looks through the knight at the king behind it. The knight is not allowed to move: that would put its own king in check.' },
      { type: 'move', fen: '4k3/pp3ppp/2n5/8/8/8/PP2BPPP/4K3 w - - 0 1', accept: ['e2b5'], text: '<b>Pin the knight</b> to the black king with your bishop.', wrong: 'Put the bishop on the diagonal that runs through the knight to the king.', ok: 'Pinned. That knight cannot move at all.' },
      { type: 'move', fen: '3rkr2/3p1p2/3p4/4n3/8/8/5P2/4R1K1 w - - 0 1', accept: ['f2f4'], text: 'Your rook pins the knight to the king. A pinned piece cannot run away, so <b>attack it with a pawn</b>.', wrongFor: { e1e5: 'That swaps your rook (5) for a knight (3). Attack the knight with a pawn instead.' }, wrong: 'Push the f-pawn two squares to attack the knight.', ok: 'The knight is attacked and cannot move away.', reply: 'f7f6' },
      { type: 'move', cont: true, accept: ['f4e5'], text: 'Black protected the knight, but it does not help. <b>Capture it with the pawn.</b>', wrong: 'Take the knight with your pawn. Winning a knight for a pawn is a great trade.', ok: 'A knight for a pawn. Pin it, then pile on.' },
      { type: 'quiz', fen: '4k3/pp3ppp/2n5/1B6/8/8/PP3PPP/4K3 b - - 0 1', text: 'Why can a piece pinned to its king not move?', options: ['Moving it would leave the king in check', 'Pinned pieces lose their turn', 'It can move, but only backwards'], answer: 0, explain: 'You may never make a move that leaves your own king in check.' }
    ] },
    { id: 'skewer', chapter: 'tactics', title: 'The skewer', icon: '♜', steps: [
      { type: 'info', fen: '3q4/8/8/8/3k4/8/8/3R2K1 b - - 0 1', arrows: [['d1', 'd8']], text: 'A <b>skewer</b> is a pin turned around: the more valuable piece is in front. When it steps out of the way, you capture what was hiding behind.' },
      { type: 'move', fen: '3q4/8/8/8/3k4/8/8/R5K1 w - - 0 1', accept: ['a1d1'], text: 'The black king and queen stand on the same file. <b>Give check along that file.</b>', wrongFor: { a1a4: 'That is check, but along the rank. Use the file the king and queen share.' }, wrong: 'Put your rook on the d-file.', ok: 'Check. The king has to step aside.', reply: 'd4e5' },
      { type: 'move', cont: true, accept: ['d1d8'], text: 'The king moved, and look what is behind him. <b>Take the queen.</b>', wrong: 'Your rook can go all the way up the file.', ok: 'A whole queen, skewered.' },
      { type: 'move', fen: '7r/8/8/4k3/8/8/8/2B3K1 w - - 0 1', accept: ['c1b2'], text: 'Bishops skewer along diagonals. The king and rook share a long diagonal. <b>Give check on it.</b>', wrongFor: { c1f4: 'The king simply captures the bishop there. Check from further away.' }, wrong: 'Find the long diagonal that runs through the king to the rook in the corner.', ok: 'Check from a safe distance.', reply: 'e5e6' },
      { type: 'move', cont: true, accept: ['b2h8'], text: '<b>Capture the rook</b> in the corner.', wrong: 'Slide the bishop all the way to h8.', ok: 'Skewered.' },
      { type: 'quiz', fen: '3q4/8/8/8/3k4/8/8/3R2K1 b - - 0 1', text: 'In a skewer, which piece stands in front?', options: ['The more valuable one', 'The less valuable one', 'Always a pawn'], answer: 0, explain: 'Skewer: valuable piece in front. Pin: valuable piece behind.' }
    ] },

    /* ---------------- chapter 4 ---------------- */
    { id: 'opening', chapter: 'openings', title: 'Three golden rules', icon: '♟', steps: [
      { type: 'info', fen: START, marks: ['d4', 'e4', 'd5', 'e5'], text: 'The first moves of a game are called the <b>opening</b>. Three golden rules:<ul><li>Put a pawn in the <b>centre</b></li><li>Bring out your <b>knights and bishops</b></li><li><b>Castle</b> early</li></ul>' },
      { type: 'move', fen: START, accept: ['e2e4'], also: ['d2d4'], text: 'Rule 1: take the centre. Move the pawn in front of your king <b>two squares</b>, to e4.', wrong: 'Move the pawn from e2 to e4.', ok: 'A pawn in the centre. It also opens paths for your queen and bishop.', reply: 'e7e5' },
      { type: 'move', cont: true, accept: ['g1f3'], also: ['b1c3'], text: 'Rule 2: bring out a knight. Move it to <b>f3</b>, where it attacks the black pawn.', wrong: 'Move the knight from g1 to f3.', ok: 'Developed, and it attacks something.', reply: 'b8c6' },
      { type: 'move', cont: true, accept: ['f1c4'], also: ['f1b5'], text: 'Now a bishop. Move it to <b>c4</b>, pointing at Black’s weakest square, f7.', wrong: 'Move the bishop from f1 to c4.', ok: 'Both pieces between your king and rook are out.', reply: 'f8c5' },
      { type: 'move', cont: true, accept: ['e1g1'], text: 'Rule 3: <b>castle</b>. Move your king two squares to the right.', wrong: 'Move the king from e1 to g1 to castle.', ok: 'Four moves: a centre pawn, two pieces out, king safe. A perfect start.' },
      { type: 'info', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P2Q/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2', marks: ['h4'], text: 'Three things to avoid in the opening:<ul><li>bringing the <b>queen out early</b>: she gets chased around</li><li>moving the <b>same piece twice</b></li><li>pushing lots of pawns on the edges</li></ul>' },
      { type: 'quiz', fen: START, text: 'Which of these is the best first move?', options: ['Pawn to e4, into the centre', 'Pawn to a4, on the edge', 'Pawn to h4, on the edge'], answer: 0, explain: 'Centre pawns control the important squares and free your pieces.' },
      { type: 'quiz', fen: '8/8/8/8/3N4/8/8/N7 w - - 0 1', marks: ['d4', 'a1'], text: 'One knight is in the centre, the other in the corner. Which can reach more squares?', options: ['The centre knight: 8 squares', 'The corner knight: 8 squares', 'They reach the same number'], answer: 0, explain: 'The corner knight reaches only 2 squares. Pieces are stronger in the centre.' }
    ] },
    { id: 'scholar', chapter: 'openings', title: 'The four-move trap', icon: '♛', orient: 'b', steps: [
      { type: 'info', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', arrows: [['h5', 'f7'], ['c4', 'f7']], text: 'You are <b>Black</b> in this lesson. White has brought the queen and bishop out early, and both aim at your pawn on <b>f7</b>. If the queen takes it, that is checkmate. Many beginners lose this way.' },
      { type: 'move', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', accept: ['g7g6'], also: ['d8e7', 'd8f6'], text: '<b>Stop the checkmate.</b> Push your g-pawn one square: it blocks the queen’s path and attacks her.', wrong: 'White still has queen takes f7. Block the queen with the pawn from g7 to g6.', ok: 'Blocked, and the queen has to run.', reply: 'h5f3' },
      { type: 'move', cont: true, accept: ['g8f6'], also: ['d8f6', 'd8e7'], text: 'The queen stepped back and threatens f7 <b>again</b>. Block her with your knight: g8 to f6.', wrong: 'The queen on f3 is aiming at f7 again. Put your knight on f6.', ok: 'Safe, and you brought a piece out while defending.' },
      { type: 'info', cont: true, text: 'White moved the queen three times and has nothing to show for it. You defended <b>and</b> developed. That is why the queen should not come out early.' },
      { type: 'quiz', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', text: 'Which square does the four-move checkmate attack?', options: ['f7, the pawn next to the black king', 'e5, the centre pawn', 'a7, the corner pawn'], answer: 0, explain: 'At the start, f7 is protected only by the king.' }
    ] },

    /* ---------------- chapter 5 ---------------- */
    { id: 'backrank', chapter: 'endgames', title: 'Back-rank mate', icon: '♜', steps: [
      { type: 'info', fen: '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', arrows: [['d8', 'g8']], text: 'The most common checkmate of all: a king stuck on his <b>back rank</b> behind his own pawns, and a rook or queen arriving on that rank.' },
      { type: 'move', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', goal: 'mate', text: '<b>Deliver the back-rank mate.</b>', wrong: 'Send the rook all the way to the 8th rank.', ok: 'Checkmate.' },
      { type: 'move', fen: '4r1k1/5ppp/8/8/8/8/Q4PPP/6K1 w - - 0 1', accept: ['h2h3', 'g2g3', 'h2h4', 'g2g4'], also: ['a2a1', 'a2a5', 'g1f1', 'f2f3', 'f2f4'], text: 'Now it is <b>your</b> king in danger: Black threatens rook to e1, checkmate. Make an <b>escape square</b> by pushing one of the pawns in front of your king.', wrong: 'Give your king room instead: push the h-pawn or the g-pawn.', ok: 'Now the king has somewhere to go. Players call this giving the king “air”.' },
      { type: 'quiz', fen: '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', text: 'How do you protect yourself from a back-rank mate?', options: ['Give the king an escape square', 'Move the king to the corner', 'Trade off all the pawns'], answer: 0, explain: 'One pawn move in front of the king is usually enough.' }
    ] },
    { id: 'ladder', chapter: 'endgames', title: 'The ladder mate', icon: '♜', steps: [
      { type: 'info', fen: '8/8/5k2/8/8/8/1R6/R5K1 w - - 0 1', text: 'Two rooks can checkmate a lone king without any help. They take turns, like climbing a <b>ladder</b>: one rook guards a rank, the other gives check on the next one.' },
      { type: 'move', fen: '8/8/5k2/8/8/8/1R6/R5K1 w - - 0 1', accept: ['a1a5'], also: ['b2b5'], text: 'First build a wall. Move the rook from a1 to <b>a5</b>: now the king cannot come down past the 5th rank.', wrong: 'Move the a1 rook up to a5.', ok: 'The 5th rank is closed.', reply: 'f6g6' },
      { type: 'move', cont: true, accept: ['b2b6'], text: 'Now the other rook climbs one rank higher: <b>check on the 6th rank</b>.', wrong: 'Move the b2 rook to b6 for check.', ok: 'Check. The king must go back.', reply: 'g6g7' },
      { type: 'move', cont: true, accept: ['a5a7'], text: 'Next rung. The lower rook jumps over: <b>check on the 7th rank</b>.', wrong: 'Move the a5 rook to a7.', ok: 'Check. Only the last rank is left.', reply: 'g7g8' },
      { type: 'move', cont: true, goal: 'mate', text: 'One more step. <b>Checkmate!</b>', wrong: 'Move the b6 rook to the 8th rank.', ok: 'Checkmate. Rooks taking turns, all the way up.' },
      { type: 'quiz', fen: '6k1/R7/1R6/8/8/8/8/6K1 w - - 0 1', text: 'In the ladder mate, what does the rook that is NOT giving check do?', options: ['It guards the rank behind, so the king cannot come back', 'Nothing', 'It protects your own king'], answer: 0, explain: 'One rook holds the wall, the other gives check.' }
    ] },
    { id: 'queenmate', chapter: 'endgames', title: 'Queen and king mate', icon: '♛', steps: [
      { type: 'info', fen: '3k4/8/3K4/8/8/8/8/7Q w - - 0 1', text: 'A queen cannot checkmate alone: she needs her king. The plan is always the same: <b>push the enemy king to the edge</b>, bring <b>your king</b> close, then checkmate.' },
      { type: 'move', fen: '3k4/8/3K4/8/8/8/8/7Q w - - 0 1', goal: 'mate', text: 'The black king is on the edge and your king stands right in front of him. <b>Checkmate in one.</b>', wrong: 'Give check along the 8th rank.', ok: 'Checkmate. Your king covers every escape square.' },
      { type: 'move', fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', goal: 'mate', text: 'Careful now. One natural-looking move here is <b>stalemate</b>, a draw. Find the checkmate.', wrong: 'Not checkmate. The queen must attack the king.', ok: 'Checkmate. When the king is cornered, always make sure your move is a check.' },
      { type: 'move', fen: '7k/8/5K2/8/8/8/6Q1/8 w - - 0 1', goal: 'mate', text: 'One more. Queen right next to the king, <b>protected by your own king</b>.', wrong: 'Put the queen where your king protects her.', ok: 'Checkmate.' },
      { type: 'quiz', fen: '3k4/8/3K4/8/8/8/8/7Q w - - 0 1', text: 'Where does the enemy king have to be before a queen and king can checkmate him?', options: ['On the edge of the board', 'In the centre', 'Anywhere'], answer: 0, explain: 'In the middle he always has an escape. Drive him to the edge first.' }
    ] },
    { id: 'kingpawn', chapter: 'endgames', title: 'The last pawn', icon: '♟', steps: [
      { type: 'info', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', text: 'Many games end with just kings and one pawn. If the pawn becomes a queen, you win. The secret: <b>your king leads the way</b>, and the pawn follows.' },
      { type: 'move', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', accept: ['e6d6'], also: ['e6f6'], text: 'Step your king <b>diagonally forward</b> to d6, to take squares away from the black king.', wrong: 'Pushing the pawn now lets Black block it. Move the king to d6 first.', ok: 'Your king goes first.', reply: 'e8d8' },
      { type: 'move', cont: true, accept: ['e5e6'], text: 'Now <b>push the pawn</b>.', wrong: 'Advance the pawn to e6.', ok: 'One step closer.', reply: 'd8e8' },
      { type: 'move', cont: true, accept: ['e6e7'], text: 'Push again. The black king is running out of squares.', wrong: 'Advance the pawn to e7.', ok: 'Black has only one move.', reply: 'e8f7' },
      { type: 'move', cont: true, accept: ['d6d7'], text: 'Guard the promotion square. <b>King to d7.</b>', wrong: 'Your king must protect e8. Move him to d7.', ok: 'Now nothing can stop the pawn.', reply: 'f7f6' },
      { type: 'move', cont: true, accept: ['e7e8q'], text: '<b>Promote to a queen!</b>', wrong: 'Push the pawn to e8 and choose the queen.', ok: 'A new queen. And you already know how to checkmate with her.' },
      { type: 'quiz', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', text: 'In a king and pawn ending, where should your king be?', options: ['In front of the pawn, leading it', 'Behind the pawn, hiding', 'Far away in a corner'], answer: 0, explain: 'The king clears the road and the pawn follows.' }
    ] }
  ];

  var api = { CHAPTERS: CHAPTERS, LESSONS: LESSONS, EMPTY: EMPTY, START: START };
  if (typeof window !== 'undefined') window.Lessons = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
