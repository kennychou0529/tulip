class NotePaletteController{
  constructor(roadbook,glyphController){
    this.glyphController = glyphController;
    this.bindToNoteSelection();
    this.bindToAddGlyphButton(roadbook);
    this.bindToNotificationUI(roadbook);
  }

  addGlyphToNote(roadbook,element){
    var src = $(element).attr('src');
    roadbook.appendGlyphToNoteTextEditor($('<img>').attr('src', src).addClass('normal'));
  }

  /*
    Here we check the note section for WPM glyphs, !!! glyphs, and eventually speed zone glyphs
    so that we can capture data for rally blitz or rally comp exports
  */
  checkForNotification(roadbook){
    if(roadbook.currentlyEditingInstruction){
      // reduce DOM image objects in the text editor to a collection of glyph names
      var glyphs = $('#note-editor').find("img").toArray().map(function(g){return $(g).attr('src').match(/\/([a-z0-9,-]*)\./)[1]})
      roadbook.currentlyEditingInstruction.manageNotifications(glyphs);
    }
  }

  bindToNoteSelection(){
    var _this = this;
    $('#note-selection-size-range').change(function(e){
      document.execCommand('fontSize',null,$(this).val());
      var sizes = {3: 'small', 4: 'normal', 5: 'large', 6: 'huge'}
      var size = sizes[$(this).val()];
      _this.resizeSelection(size);
    });

    $('#note-selection-bold').click(function(){
      document.execCommand('bold',null,false);
      $(this).toggleClass('active');
      $(this).blur();
    })

    $('#note-selection-italic').click(function(){
      document.execCommand('italic',null,false)
      $(this).toggleClass('active');
      $(this).blur();
    })

    $('#note-selection-underline').click(function(){
      document.execCommand('underline',null,false)
      $(this).toggleClass('active');
      $(this).blur();
    })
  }

  bindToNotificationUI(roadbook){
    var _this = this;
    $('#show-notification-options').click(function(){
      var notification = roadbook.currentlyEditingInstruction.notification;
      $('#notification-bubble').val(notification.bubble);
      $('#notification-modifier').val(notification.modifier);
      $('#notification-modifier').attr('min', notification.modMin);
      $('#notification-modifier').attr('max', notification.modMax);
      $('#notification-modifier').attr('step', notification.modStep);
    });
    //TODO decouple this and don't mutate, it's weird
    $('#notification-bubble, #notification-modifier').bind('keyup input',function(){
      var notification = roadbook.currentlyEditingInstruction.notification;
      notification.bubble = $('#notification-bubble').val();
      notification.modifier = $('#notification-modifier').val();
      _this.checkForNotification(roadbook); //TODO This needs refactored (mehbe as callback)
    });
  }

  bindToAddGlyphButton(roadbook){
    var _this = this;
    $('#add-glyph-to-note').click(function(e){
      e.preventDefault();
      _this.glyphController.showGlyphModal(roadbook,_this.addGlyphToNote);
    });
  }

  updateNotificationControls(notification){
    $('#notification-bubble').val(notification.bubble);
    $('#notification-modifier').val(notification.modifier);
    $('#notification-modifier').attr('min', notification.modMin);
    $('#notification-modifier').attr('max', notification.modMax);
    $('#notification-modifier').attr('step', notification.modStep);
  }

  resizeSelection(size){
    var sel = window.getSelection();
    var images = $('#note-editor img')
    for(var i=0;i<images.length;i++){
      if(sel.containsNode(images[i])){
        $(images[i]).removeClass();
        $(images[i]).addClass(size);
      }
    }
  }
}