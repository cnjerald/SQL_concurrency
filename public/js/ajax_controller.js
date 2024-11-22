$(document).ready(function(){
    $(".read-btn").click(function(){
        $.post(
            "/ajax_read",
            {appID : $(".read-ID").val(),
             delay : $(".delay").val()
            },
            function(data,status){
                if(status === "success"){
                    console.log(data);
                }
            }
        
        )
    })


})