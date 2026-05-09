document.getElementById('fetchData').addEventListener('click', function() {
    fetch('../backend/api.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('result').innerText = data.message;
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('result').innerText = 'Error fetching data';
        });
});