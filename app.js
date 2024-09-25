// Initialize Supabase Client (if not already done)
const { createClient } = supabase;
const supabaseUrl = 'https://itynwantflyqqktyoqem.supabase.co/'; // Replace with your actual Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eW53YW50Zmx5cXFrdHlvcWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyNjI5OTUsImV4cCI6MjA0MjgzODk5NX0.6o1O5uqLCzoQM3nqdgLSCBj6nIMAq5wMGom_gb1Ckk4'; // Replace with your actual Supabase API key
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to fetch data from villa_data table
async function fetchData() {
    let { data, error } = await supabase
        .from('villa_data') // This is your table name
        .select('*');

    if (error) {
        console.error('Error fetching data:', error);
    } else {
        console.log('Data:', data);
        // Display or manipulate the data as needed
        const outputDiv = document.getElementById('output'); // Ensure this element exists in your HTML
        outputDiv.innerHTML = JSON.stringify(data, null, 2); // Format the data for display
    }
}

// Call the function to fetch data
fetchData();
