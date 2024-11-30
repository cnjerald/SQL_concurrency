$(document).ready(function () {
    $(".read-btn").click(function () {
        $.post(
            "/ajax_read",
            {
                appID: $(".read-ID").val(),
                delay: $(".delay").val()
            },
            function (response, status) {
                if (status === "success") {
                    // Clear previous table content
                    $("#data-table tbody").empty();

                    const data = response.data; // Extract data from response
                    if (Array.isArray(data)) {
                        // Handle array of objects
                        data.forEach(item => {
                            const row = `
                                <tr>
                                    <td>${item.AppID}</td>
                                    <td>${item.Name}</td>
                                    <td>${item["Release date"]}</td>
                                    <td>${item["Peak CCU"]}</td>
                                </tr>
                            `;
                            $("#data-table tbody").append(row);
                        });
                    } else if (typeof data === "object") {
                        // Handle single object
                        const row = `
                            <tr>
                                <td>${data.AppID}</td>
                                <td>${data.Name}</td>
                                <td>${data["Release date"]}</td>
                                <td>${data["Peak CCU"]}</td>
                            </tr>
                        `;
                        $("#data-table tbody").append(row);
                    } else {
                        console.error("Unexpected data format");
                    }
                }
            }
        );
    });

    $(".write-btn").click(function(){
        $.post("ajax_write_CCU",
            {appID : $(".writeID").val(), newVal : $(".newVal").val(), delay : $(".delay1").val()},
        
        )

        
    })
});
