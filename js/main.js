(function($) {
    // TODO: Figure out parent pages, What if faux parent?
    // TODO: Figure out issue with adding more than 10 pages. Why timing out or failing.
    // TODO: Add option to add title into post as h1

    var testing = false;
    var testingCreate = false;

    var newStuff = [];
    var uniqueParentTaskArray = [];
    var csvData = '';
    var totalCount = '';
    var processErrors = '';
    $('body').on('submit', '.main-column form', function(e) {
        e.preventDefault();
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

                    // Load settings view
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
                    
                    // Fill any fields with previously entered data
                    setTimeout(function(){
                        var bulk_settings = JSON.parse(getCookie('bulk-settings'));
                        if( bulk_settings ) {
                            $('.form-control').each(function(){
                                $(this).val(bulk_settings[$(this).attr('name')]);
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
    $('body').on('submit', '.settings-view form', function(e) {
        e.preventDefault();
        
        // Set each value into a cookie for easy re-entry of data
        var cookieObject = {};
        $('.form-control').each(function(){
            cookieObject[$(this).attr('name')] = $(this).val();
        });
        var cookieObjectJSON = JSON.stringify(cookieObject);
        setCookie('bulk-settings', cookieObjectJSON, 90);
        
        $('.main-column').load(ajax_object.pluginURL + "view/results.html");
        var title = $('.settings-view .selector-title').val();
        var content = $('.settings-view .selector-content').val();
        var date = $('.settings-view .selector-date').val();
        var website_url = $('.settings-view .website-url').val();
        var originalURI = $('.settings-view .original-uri').val();
        var newURI = $('.settings-view .new-uri').val();
        var postType = $('.settings-view [name="post_type"]').val();
        var remove_style = $('.settings-view [name="remove-style"]').is(':checked') ? true : false;
        var add_h1 = $('.settings-view [name="add-h1"]').is(':checked') ? true : false;
        var htmlOptions = {
            'remove_style' : remove_style,
            'add_h1' : add_h1
        }
        var contentSelectors = {
            'title' : title,
            'content' : content,
            'date' : date,
        }

        // Create Parent Page Array First
        var parentTaskArray = [];
        $.each( csvData, function(index, value){
            var ogURI = removeTrailingSlash(value[originalURI]);
            if( ogURI !=='' ) {
                var uriArray = ogURI.replace(/\/\s*$/,'').split('/');
                uriArray.shift();
                if( uriArray.length > 1 ) {
                    // If url has 2 slashes grab the 2nd to last source add into Array
                    if( uriArray.length == 2 ) {
                        var parentPage = uriArray[0];
                    } else {
                        var parentPage = uriArray[uriArray.length - 2];
                    }
                    var childrenArray = [];
                    parentTaskArray.push( {parentPage:parentPage, children:childrenArray} );
                }
            }else{
                csvData.splice(index,1);
            }
        });
        uniqueParentTaskArray = removeDuplicates( parentTaskArray );
        
        // Loop through csv rows and grab html from url
        var counter = 0;
         function recursively_ajax() {
            var pass_data = {
                'action': 'get_url_contents',
                'url_to_process': website_url + csvData[counter][originalURI],
            };
            $.ajax({
                type:"POST",
                // async:false, // set async false to wait for previous response
                url: ajax_object.ajax_url,
                dataType : "html",
                data: pass_data,
                success: function( data ) {
                    parsePostContent(data, csvData[counter], contentSelectors, website_url, csvData[counter][originalURI], csvData[counter][newURI], counter, postType, false, htmlOptions);
                    
                    counter++;
                    if( counter < csvData.length ) {
                        recursively_ajax();
                    }else{
                        updatePagesWithParent(postType);
                    }
                }
            });
         }      
         recursively_ajax();
    });
    
    
    // TODO: Clean arguments to one args object
    function parsePostContent(data, url, contentSelectors, website_url, originalURI, newURI, index, postType, htmlOptions){

        // Update progress bar
        var totalCount = csvData.length;
        var percentDone = ((index + 1) / totalCount) * 10;
        var previousPercent = $('.main-column .status-bar').attr('data-percent');
        if( percentDone > previousPercent ) {
            $('.main-column .status-bar').css({'width' : percentDone + '%'});
            $('.main-column .status-bar').attr('data-percent', percentDone);
        }
        if( percentDone == 10 ) {
            $('.main-column .status-processing').html('Creating Posts/Pages...');
            $('.main-column .results-list').append('<h2>Results: </h2>');
        }
        
        var html = $(data);
        var contentArea = $('.main-column');
        
        // TODO: Add clean HTML options
        
        // Remove HTML comments
        $('*', html).contents().each(function() {
            if(this.nodeType === Node.COMMENT_NODE) {
                $(this).remove();
            }
        });
        
        $('p', html).each(function() {
            $(this).after($(this).html() + "\r");
            $(this).remove();
        });
        
        $('img', html).each(function() {
            // Remove style and add align classes if floated
            if ( $(this).css('float') == 'left' ) {
                $(this).addClass('alignleft');
            }else if( $(this).css('float') == 'right' ) {
                $(this).addClass('alignright');
            }
            $(this).removeAttr('style');
            
            // Change images with src /images to add url in front
            var src_attr = $(this).attr('src');
            if (src_attr.match("^/")) {
                $(this).attr('src', website_url + src_attr);
            }
        });
        
        if( htmlOptions.remove_style ) {
            // Remove style attibute from elements except for text-align
            $('[style]', html).each(function() {
                $(this).removeAttr('style');
            });
        }
        
        if( htmlOptions.add_h1 ) {
            // Remove style attibute from elements except for text-align
            $(contentSelectors.content, html).append('<h1>' + $(contentSelectors.title, html) + '</h1>');
        }
        
        if( $(contentSelectors.content, html).length > 0 ) {
            post_html = $(contentSelectors.content, html).html().trim();
        }
        
        // Set fallback values if empty or not found
        var post_title = $(contentSelectors.title, html).length > 0 ? $(contentSelectors.title, html).text() : '';
        var post_slug = website_url;
        var post_content = $(contentSelectors.content, html).length > 0 ? post_html : '';
        var post_date_raw = $(contentSelectors.date, html).length > 0 ? $(contentSelectors.date, html).text() : '';
        var meta_title = html.filter('title').length > 0 ? html.filter('title').text() : '';
        var meta_description = html.filter('meta[name=description]').length > 0 ? html.filter('meta[name=description]').attr('content') : '';
        
        console.log(post_content);

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
            }
        }

        if( post_content.length <= 0 ) {
            processErrors += 'Post Content Not Found.'
        }

        if( post_title.length <= 0 ) {
            processErrors += '<br />Post Title Not Found.'
        }

        if( typeof(post_date) != "undefined" ) {
            if( post_date.length <= 0 ) {
                processErrors += '<br />Post Date Not Found.'
            }
        }

        var post_array = {
            'title' : post_title,
            'content' : post_content,
            'date' : post_date,
            'slug' : finalNewURI,
            'status' : 'publish',
            'meta_title' : meta_title,
            'meta_description' : meta_description
        };
        createPost(newSlug, post_array, index + 1, totalCount, processErrors, postType);

        processErrors = '';
    }

    var createdPostID = ''
    function createPost(newSlug, post_array, realIndex, totalCountCSV, processErrors, postType){
        var createPost = new XMLHttpRequest();
        createPost.open("POST", ajax_object.siteURL + "/wp-json/wp/v2/" + postType);
        createPost.setRequestHeader("X-WP-Nonce", ajax_object.nonce);
        createPost.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        createPost.send(JSON.stringify(post_array));
        createPost.onreadystatechange = function() {
            if (createPost.readyState == 4) {
                if (createPost.status == 201) {
                    var successResponse = JSON.parse(createPost.response);

                    if( typeof(newSlug) != "undefined" ) {
                        if( newSlug.length > 0 ) {
                            var newSlugClean = removeTrailingSlash( newSlug );
                            newSlugClean = removeLeadingSlash( newSlug );
                        }
                    }

                    var uriArray = newSlugClean.replace(/\/\s*$/,'').split('/');
                    var parentToFind = '';
                    if( uriArray.length > 1 ) {
                        if( uriArray.length == 2 ) {
                            var parentToFind = uriArray[0];
                        }else{
                            var parentToFind = uriArray.slice(-1)[0];
                        }
                    }

                    $.each(uniqueParentTaskArray, function(index, value){
                        if( parentToFind == value['parentPage'] ) {
                            uniqueParentTaskArray[index]['children'].push( successResponse.id );
                        }
                        if( post_array.slug == value['parentPage'] ) {
                            uniqueParentTaskArray[index]['parentID'] = successResponse.id;
                        }
                    });

                    var percentDone = ((realIndex / totalCountCSV) * 90) + 10;
                    var previousPercent = $('.main-column .status-bar').attr('data-percent');
                    if( percentDone > previousPercent ) {
                        $('.main-column .status-bar').css({'width' : percentDone + '%'});
                        $('.main-column .status-bar').attr('data-percent', percentDone);
                    }
                    if( percentDone == 100 ) {
                        $('.main-column .progress').html('<h2 style="color: #18b118">Import Complete</h2>');
                        $('.main-column .results-list').append('<br /><h2 style="color: #18b118">Import Complete</h2>');
                    }

                    if( post_array.slug !== successResponse.slug ) {
                        processErrors += '<br />Page slug has been altered from initial input.<br />'
                    }

                    $('.main-column .results-list').append(realIndex + '.<br /><strong>Successfully Created Post:</strong> ' + successResponse.title.raw + '<br /><strong>Post ID:</strong> ' + successResponse.id + '<br /><strong>Post Slug:</strong> ' + successResponse.slug + '<br />');
                    if( processErrors.length > 0 ) {
                        $('.main-column .results-list').append('<div class="errors">' + processErrors + '</div>');
                    }
                    $('.main-column .results-list').append('<a href="' + ajax_object.siteURL + '/wp-admin/post.php?post=' + successResponse.id + '&action=edit" target="_blank" class="edit-link">Edit</a> <a href="' + successResponse.link + '" class="view-link" target="_blank">View</a> <br /><br />');
                    
                    // Add in yoast meta data with ajax
                    var data = {
                        'action': 'add_yoast_content',
                        'YoastPostID' : successResponse.id,
                        'YoastPost_title' : post_array.meta_title,
                        'YoastPost_desc' : post_array.meta_description
                    };
                    $.post(ajax_object.ajax_url, data, function(response) {});

                    updatePagesWithParent(postType);

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

    function updatePagesWithParent(postType) {
        $.each( uniqueParentTaskArray, function(index,value) {
            var parentItemID = value['parentID'];
            $.each( value['children'], function(index,value) {
                var post_array = {
                    'parent' : parentItemID
                }
                // update this page: value with this parent id: parentItemID
                var createPost = new XMLHttpRequest();
                createPost.open("POST", ajax_object.siteURL + "/wp-json/wp/v2/" + postType + '/' + value );
                createPost.setRequestHeader("X-WP-Nonce", ajax_object.nonce);
                createPost.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                createPost.send(JSON.stringify(post_array));
                createPost.onreadystatechange = function() {
                    if (createPost.readyState == 4) {
                        if (createPost.status == 201) {
                            var successResponse = JSON.parse(createPost.response);
                            console.log(successResponse);
                        }
                    }
                }
            });
        });
    }
    
    function setCookie(name, value, days) {
    var expires;

    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    } else {
        expires = "";
    }
    document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = encodeURIComponent(name) + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ')
            c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0)
            return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}

})( jQuery );
