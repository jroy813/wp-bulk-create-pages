(function($) {

    var testing = false;
    var testingCreate = false;

    var newStuff = [];
    var uniqueParentTaskArray = [];
    var csvData = '';
    var totalCount = '';
    var processErrors = '';
    $('.jroy-button').click(function(){
        $('.main-column input[type=file]').parse({
            config: {
        		// base config to use for each file
                header: true,
                complete: function(results, file) {
                    var spreadsheetRow1 = results.data[0];
                    csvData = results.data;
                    var spreadsheetHeaders = [];
                    for (var property in spreadsheetRow1) {
                        if (spreadsheetRow1.hasOwnProperty(property)) {
                                spreadsheetHeaders.push(property);
                            }
                    }

                    $('.main-column').html('');
                    $('.main-column').load(ajax_object.pluginURL + "view/settings.html");


                    setTimeout(function(){
                        $.each( spreadsheetHeaders, function(key, value){
                            var selected = '';
                            if( value == 'URI' || value == 'uri' || value == 'Original URI' || value == 'url' ){
                                selected = 'selected';
                            }else{
                                selected = '';
                            }
                            $('<option value="' + value + '" ' + selected + ' >' + value + '</option>').appendTo($('.original-uri'));
                        });
                    }, 200);

                    setTimeout(function(){
                        if( spreadsheetHeaders.length > 1 ) {
                            $.each( spreadsheetHeaders, function(key, value){
                                var selected = '';
                                if( value.indexOf('Recommended URL') != -1 ){
                                    selected = 'selected';
                                }else{
                                    selected = '';
                                }
                                $('<option value="' + value + '" ' + selected + ' >' + value + '</option>').appendTo($('.new-uri'));
                            });
                        }
                    }, 200);
                }
        	},
        	before: function(file, inputElem){
        	},
        	error: function(err, file, inputElem, reason){
        	},
        	complete: function(){
        	}
        });


    });

    $('body').on('click', '.generate-button', function() {
        $('.main-column').load(ajax_object.pluginURL + "view/results.html");
        var title = $('.settings-view .selector-title').val();
        var content = $('.settings-view .selector-content').val();
        var date = $('.settings-view .selector-date').val();
        var website_url = $('.settings-view .website-url').val();
        var originalURI = $('.settings-view .original-uri').val();
        var newURI = $('.settings-view .new-uri').val();
        var postType = $('.settings-view [name="post_type"]').val();

        var contentSelectors = {
            'title' : title,
            'content' : content,
            'date' : date,
        }

        // Create Parent Page Array First
        var parentTaskArray = [];
        $.each( csvData, function(index, value){
            var ogURI = removeTrailingSlash(value[originalURI]);
            var uriArray = ogURI.replace(/\/\s*$/,'').split('/');
            uriArray.shift();
            if( uriArray.length > 1 ) {
                // If url has 2 slashes grab the 2nd to last source add into Array
                if( uriArray.length == 2 ) {
                    var parentPage = uriArray[0];
                } else {
                    var parentPage = uriArray[uriArray.length - 2];
                }
                parentTaskArray.push( {parentPage:parentPage,csvValue:value} );
            }
            // Add parent pages and store ID's into associative arrray
        });

        uniqueParentTaskArray = removeDuplicates( parentTaskArray );
        console.log(uniqueParentTaskArray);

        $.each( csvData, function(index, value){
            var csvDataOG = value;
            $.each( uniqueParentTaskArray, function(index, value){
                var urlToCheck = removeLeadingSlash( csvDataOG[originalURI] );
                var urlToCheck = removeTrailingSlash( urlToCheck );
                var uriArray = urlToCheck.replace(/\/\s*$/,'').split('/');
                var finalNewURI = uriArray.slice(-1)[0];
                if( finalNewURI == value['parentPage'] ) {
                    var data = {
                		'action': 'parse_url_content',
                		'url_to_parse': website_url + csvDataOG[originalURI],
                	};
                	$.post(ajax_object.ajax_url, data, function(data) {
                        parsePostContent(data, csvDataOG, contentSelectors, website_url, csvDataOG[originalURI], csvDataOG[newURI], index, postType, true);
                	});
                }
            });
        });

        // $.each( csvData, function(index, value){
        //     var data = {
        // 		'action': 'parse_url_content',
        // 		'url_to_parse': website_url + value[originalURI],
        // 	};
        // 	$.post(ajax_object.ajax_url, data, function(data) {
        //         // parsePostContent(data, value, contentSelectors, website_url, value[originalURI], value[newURI], index, postType, false);
        // 	});
        // });
    });

    function parsePostContent(data, url, contentSelectors, website_url, originalURI, newURI, index, postType, parentTaskBool){

        // Add slug as the last source in url string

        // Set page parent to parent ID based on associative array and 2nd to last source

        var totalCount = csvData.length;
        var html = $(data);
        var contentArea = $('.main-column');
        if( $(contentSelectors.title, html).length > 0 ) {
            var post_title = $(contentSelectors.title, html).text();
        }else{
            var post_title = url;
        }


        if( $(contentSelectors.content, html).length > 0 ) {
            var post_content = $(contentSelectors.content, html).html();
        }else{
            var post_content = '';
        }


        var featured_image = $('.post-content img', html).attr('src');
        var meta_title = html.filter('title').text();
        var meta_description = html.filter('meta[name=description]').attr('content');
        if( $(contentSelectors.date, html).length > 0 ) {
            var post_date_raw = $(contentSelectors.date, html).text();
        } else {
            var post_date_raw = '';
        }

        if( typeof(newURI) != "undefined" ) {
            if( newURI.length > 0 ) {
                var newSlug = removeTrailingSlash( newURI );
            }else{
                var newSlug = removeTrailingSlash ( originalURI );
            }
        }else{
            var newSlug = removeTrailingSlash ( originalURI );
        }

        var uriArray = newSlug.replace(/\/\s*$/,'').split('/');
        var finalNewURI = uriArray.slice(-1)[0];

        // Format date for data insertion. If no date, throw errow.
        if( contentSelectors.date && post_date_raw.length > 0 ) {
            if(Date.parse(post_date_raw)){
                var post_date = new Date(post_date_raw).toISOString();
            }else{
                var post_date = '';
                console.log('Date Issue: ');
                console.log(url);
            }
        }

        var post_slug = website_url;

        var post_array = {
            'title' : post_title,
            'content' : post_content,
            'date' : post_date,
            'slug' : finalNewURI,
            'status' : 'publish',
            'meta_title' : meta_title,
            'meta_description' : meta_description
        };

        var percentDone = ((index + 3) / totalCount) * 60;
        var previousPercent = $('.main-column .status-bar').attr('data-percent');
        if( percentDone > previousPercent ) {
            $('.main-column .status-bar').css({'width' : percentDone + '%'});
            $('.main-column .status-bar').attr('data-percent', percentDone);
        }

        if( percentDone == 60 ) {
            $('.main-column .status-processing').html('Creating Posts/Pages...');
            $('.main-column .results-list').append('<h2>Results: </h2>');
        }

        if( post_content.length <= 0 ) {
            processErrors += 'Post Content Not Found.'
        }

        if( post_title.length <= 0 ) {
            processErrors += '<br />Post Title Not Found.'
        }

        if( parentTaskBool ===false ) {
            var isParent = false;
            $.each( uniqueParentTaskArray, function(index, value){
               if( finalNewURI == value['parentPage'] ) {
                   isParent = true;
               }
           });
            if( isParent === false ) {
                createPost(newSlug, post_array, index + 3, totalCount, processErrors, postType, parentTaskBool);
            }
        }else{
            createPost(newSlug, post_array, index + 3, totalCount, processErrors, postType, parentTaskBool);
        }


        processErrors = '';
    }

    var createdPostID = ''
    function createPost(newSlug, post_array, realIndex, totalCountCSV, processErrors, postType, parentTaskBool){
        var createPost = new XMLHttpRequest();
        createPost.open("POST", ajax_object.siteURL + "/wp-json/wp/v2/" + postType);
        createPost.setRequestHeader("X-WP-Nonce", ajax_object.nonce);
        createPost.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        if( parentTaskBool === false ) {
            console.log('parentTaskBool is false for');
            console.log(post_array);
            // if url has parent
            var uriArray = newSlug.replace(/\/\s*$/,'').split('/');
            uriArray.shift();
            if( uriArray.length > 1 ) {
                if( uriArray.length == 2 ) {
                    var parentToFind = uriArray[0];
                }else{
                    var parentToFind = uriArray[uriArray.length - 2];
                }
                // console.log(parentToFind);
                $.each( uniqueParentTaskArray, function(index, value){
                   if( parentToFind == value['parentPage'] ) {
                       var parentID = value['parentID'];
                       // console.log(parentID);

                       post_array['parent'] = parentID;
                       // console.log(uriArray);
                       // console.log(post_array);
                   }
                });
            }
        }
        createPost.send(JSON.stringify(post_array));
        createPost.onreadystatechange = function() {
          if (createPost.readyState == 4) {
            if (createPost.status == 201) {
                    var successResponse = JSON.parse(createPost.response);

                    if( parentTaskBool === true ) {
                        console.log('parentTaskBool is true for');
                        console.log(post_array);

                        $.each( uniqueParentTaskArray, function(index, value){
                           if( post_array['slug'] == value['parentPage'] ) {
                               value['parentID'] = successResponse.id;
                           }
                        });
                   }
                    // console.log(successResponse);
                    var percentDone = ((realIndex / totalCountCSV) * 40) + 60;
                    var previousPercent = $('.main-column .status-bar').attr('data-percent');
                    if( percentDone > previousPercent ) {
                        $('.main-column .status-bar').css({'width' : percentDone + '%'});
                        $('.main-column .status-bar').attr('data-percent', percentDone);
                    }

                    if( percentDone == 100 ) {
                        $('.main-column .progress').html('<h2 style="color: #18b118">Import Complete</h2>');
                        $('.main-column .results-list').append('<br /><h2 style="color: #18b118">Import Complete</h2>');
                    }

                  $('.main-column .results-list').append('Successfully Created Post: ' + successResponse.title.raw + '<br />Post ID: ' + successResponse.id + '<br />');
                if( processErrors.length > 0 ) {
                    $('.main-column .results-list').append('<div class="errors">' + processErrors + '</div>');
                }
                  $('.main-column .results-list').append('<a href="' + ajax_object.siteURL + '/wp-admin/post.php?post=' + successResponse.id + '&action=edit" target="_blank" class="edit-link">Edit</a> <a href="' + successResponse.link + '" class="view-link" target="_blank">View</a> <br /><br />');
                  var data = {
              		'action': 'add_yoast_content',
                    'YoastPostID' : successResponse.id,
                    'YoastPost_title' : post_array.meta_title,
                    'YoastPost_desc' : post_array.meta_description
              	};
              	// $.post(ajax_object.ajax_url, data, function(response) {
                      // parsePostContent(response);
              	// });
                return successResponse.id;
            } else {
                // $('.main-column .results-list').append('<div class="errors">Error: ' + createPost.response + '</div><br /><br />');
            }
          }
        }
    }

    function removeTrailingSlash( url ) {
        return url.replace(/\/$/, "");
    }

    function removeLeadingSlash( url ) {
        return url.replace(/^\/+/g, '');
    }

    function removeDuplicates(arr){
        var unique_array = []
        for(var i = 0;i < arr.length; i++){
            if(unique_array.indexOf(arr[i]) == -1){
                unique_array.push(arr[i])
            }
        }
        return unique_array
    }

})( jQuery );
