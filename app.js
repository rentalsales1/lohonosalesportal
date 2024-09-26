// Import the Supabase client if using ES Modules (optional depending on your setup)
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = 'https://itynwantflyqqktyoqem.supabase.co/'; // Replace with your actual Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eW53YW50Zmx5cXFrdHlvcWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyNjI5OTUsImV4cCI6MjA0MjgzODk5NX0.6o1O5uqLCzoQM3nqdgLSCBj6nIMAq5wMGom_gb1Ckk4'; // Use anon/public API key in frontend
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to fetch data from villa_data table
async function fetchData() {
    let { data, error } = await supabase
        .from('villa_data') // Table name
        .select('*'); // Select all columns
    
    const outputDiv = document.getElementById('output'); // Ensure this exists in HTML

    if (error) {
        console.error('Error fetching data:', error);
        if (outputDiv) {
            outputDiv.innerHTML = `<p style="color: red;">Error fetching data: ${error.message}</p>`;
        }
    } else {
        console.log('Data:', data);
        if (outputDiv) {
            outputDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`; // Format the data for display
        }
    }
}

// Call the function to fetch data when the page loads
document.addEventListener('DOMContentLoaded', fetchData);
