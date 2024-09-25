const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const multer = require('multer');


const app = express();

//  connection to the database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0168', 
    database: 'villas'
});


db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err);
        throw err;
    }
    console.log('Connected to MySQL database.');
});

// static files from the project root directory
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/sop', express.static(path.join(__dirname, 'sop')));
app.use('/formats', express.static(path.join(__dirname, 'formats')));
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});


// EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// villas, uploads, and SOP directories
const villasDir = path.join(__dirname, 'villas');
if (!fs.existsSync(villasDir)) {
    fs.mkdirSync(villasDir);
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const sopDir = path.join(__dirname, 'sop');
if (!fs.existsSync(sopDir)) {
    fs.mkdirSync(sopDir);
}

const offersDir = path.join(__dirname, 'offers');
if (!fs.existsSync(offersDir)) {
    fs.mkdirSync(offersDir);
}

const formatsDir = path.join(__dirname, 'formats');
if (!fs.existsSync(formatsDir)) {
    fs.mkdirSync(formatsDir);
}
// multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'sopFile') {
            cb(null, sopDir); // SOP files go to the SOP directory
        }else if (file.fieldname === 'offerFile') {
            cb(null, offersDir); // Offer files go to the offers directory
        }else if (file.fieldname === 'formatFile') {
            cb(null, formatsDir); // Format files go to the format directory
        } else {
            cb(null, uploadsDir); // Other files go to the uploads directory
        }
    },
    filename: (req, file, cb) => {
        const name = req.body.name || file.originalname; 
        cb(null, name + path.extname(file.originalname)); 
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Function to create a static villa page
function createStaticPage(villaId, villaData, res) {
    const filePath = path.join(villasDir, `${villaId}.html`);

    console.log(`Attempting to create static page for Villa ID: ${villaId} at path: ${filePath}`);

    ejs.renderFile(path.join(__dirname, 'displayvilla.ejs'), {
        villa: villaData
    }, (err, html) => {
        if (err) {
            console.error('EJS render error:', err);
            return res.status(500).send('An error occurred while creating the villa page.');
        }

        console.log('EJS template rendered successfully.');

        fs.writeFile(filePath, html, (err) => {
            if (err) {
                console.error('File write error:', err);
                return res.status(500).send('An error occurred while saving the villa page.');
            }

            console.log(`Villa page created successfully at ${filePath}`);
            res.send(`Villa data saved and page created successfully at ${filePath}.`);
        });
    });
}

// Add New Villa
app.post('/submit_villa', upload.array('villa_image', 5), (req, res) => {
    try {
        const {
            villa_name,
            location,
            usp,
            num_bedrooms,
            num_beds,
            bed_config,
            num_bathrooms,
            num_guests,
            num_guest_staff,
            pool_config,
            speakers_with_brand,
            nearby_restaurants,
            nearby_things_to_do,
            nearby_villas,
            nearby_beaches,
            pet_friendly,
            senior_citizen_friendly,
            smoking,
            spa,
            board_games,
            house_rules,
            google_map,
            other_info,
            region
        } = req.body;

        // comma-separated string
        const villa_image = req.files ? req.files.map(file => file.filename).join(',') : '';

        if (!villa_name || !location || !num_bedrooms || !num_beds || !bed_config || !num_bathrooms || !num_guests || !num_guest_staff || pet_friendly === undefined || senior_citizen_friendly === undefined || smoking === undefined || spa === undefined || board_games === undefined || !region || !villa_image) {
            return res.status(400).send('All required fields must be filled.');
        }

        const query = `INSERT INTO villa_data (
            villa_name, location, usp, num_bedrooms, num_beds, bed_config, num_bathrooms, num_guests, num_guest_staff, pool_config,
            speakers_with_brand, nearby_restaurants, nearby_things_to_do, nearby_villas, nearby_beaches, pet_friendly,
            senior_citizen_friendly, smoking, spa, board_games, house_rules, google_map, other_info, region, villa_image
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            villa_name, location, usp, num_bedrooms, num_beds, bed_config, num_bathrooms, num_guests, num_guest_staff, pool_config,
            speakers_with_brand, nearby_restaurants, nearby_things_to_do, nearby_villas, nearby_beaches, pet_friendly,
            senior_citizen_friendly, smoking, spa, board_games, house_rules, google_map, other_info, region, villa_image
        ];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('An error occurred while saving the villa data.');
            }

            console.log('Villa data inserted successfully with ID:', result.insertId);

            // Fetch the villa data and create a static page
            db.query('SELECT * FROM villa_data WHERE id = ?', [result.insertId], (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send('An error occurred while fetching the villa data.');
                }
                console.log('Villa data fetched successfully:', results[0]);
                createStaticPage(result.insertId, results[0], res);
            });
        });

    } catch (error) {
        console.error('Error saving villa data:', error);
        res.status(500).send('An error occurred while saving the villa data.');
    }
});

// Fetch All Villas
app.get('/villas', (req, res) => {
    const query = 'SELECT * FROM villa_data';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('An error occurred while fetching the villa data.');
        }
        res.json(results);
    });
});

// Route to delete a villa
app.delete('/delete_villa/:id', (req, res) => {
    const villaId = req.params.id;
    const filePath = path.join(villasDir, `${villaId}.html`);

    // Delete the villa from the database
    const query = 'DELETE FROM villa_data WHERE id = ?';
    db.query(query, [villaId], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('An error occurred while deleting the villa.');
        }

        // Delete the corresponding file
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('File deletion error:', err);
                return res.status(500).send('An error occurred while deleting the villa file.');
            }

            console.log(`Villa with ID ${villaId} deleted successfully.`);
            res.send('Villa deleted successfully.');
        });
    });
});



// Fetch Single Villa Data
app.get('/villa/${villaId}', (req, res) => {
    const villaId = req.params.id;
    const query = 'SELECT * FROM villa_data WHERE id = ?';

    db.query(query, [villaId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('An error occurred while fetching the villa data.');
        }
        console.log('Villa data fetched successfully:', results[0]);
        createStaticPage(villaId, results[0], res);
    });
});


// Fetch villa details
app.get('/api/villas/:id', (req, res) => {
    const villaId = req.params.id;
    db.query('SELECT * FROM villa_data WHERE id = ?', [villaId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results[0]);
    });
});

// Update villa details
app.put('/api/villas/:id', upload.single('villa_image'), (req, res) => {
    const villaId = req.params.id;
    let villaImage = req.file ? req.file.filename : req.body.villa_image;

    const villaData = {
        villa_name: req.body.villa_name,
        region: req.body.region,
        location: req.body.location,
        usp: req.body.usp,
        num_bedrooms: req.body.num_bedrooms,
        num_beds: req.body.num_beds,
        bed_config: req.body.bed_config,
        num_bathrooms: req.body.num_bathrooms,
        num_guests: req.body.num_guests,
        num_guest_staff: req.body.num_guest_staff,
        pool_config: req.body.pool_config,
        speakers_with_brand: req.body.speakers_with_brand,
        nearby_restaurants: req.body.nearby_restaurants,
        nearby_things_to_do: req.body.nearby_things_to_do,
        nearby_villas: req.body.nearby_villas,
        nearby_beaches: req.body.nearby_beaches,
        pet_friendly: req.body.pet_friendly,
        senior_citizen_friendly: req.body.senior_citizen_friendly,
        smoking: req.body.smoking,
        spa: req.body.spa,
        board_games: req.body.board_games,
        house_rules: req.body.house_rules,
        google_map: req.body.google_map,
        villa_image: villaImage,
        other_info: req.body.other_info
    };

    // Update villa data in the database
    db.query('UPDATE villa_data SET ? WHERE id = ?', [villaData, villaId], (err) => {
        if (err) {
            console.error('Database update error:', err);
            return res.status(500).send('Failed to update villa details.');
        }

        // Fetch updated villa data
        db.query('SELECT * FROM villa_data WHERE id = ?', [villaId], (err, results) => {
            if (err) {
                console.error('Database fetch error:', err);
                return res.status(500).send('Failed to fetch updated villa details.');
            }

            // Update the static HTML page
            const filePath = path.join(villasDir, `${villaId}.html`);
            ejs.renderFile(path.join(__dirname, 'displayvilla.ejs'), {
                villa: results[0]
            }, (err, html) => {
                if (err) {
                    console.error('EJS render error:', err);
                    return res.status(500).send('Failed to render the updated page.');
                }

                fs.writeFile(filePath, html, (err) => {
                    if (err) {
                        console.error('File write error:', err);
                        return res.status(500).send('Failed to update the static page.');
                    }

                    console.log(`Villa page updated successfully at ${filePath}`);
                    res.send('Villa updated successfully and static page updated.');
                });
            });
        });
    });
});


// Test Route
app.get('/test', (req, res) => {
    ejs.renderFile(path.join(__dirname, 'displayvilla.ejs'), {
        villa: {
            villa_name: "Test Villa",
            location: "Test Location"
            
        }
    }, (err, html) => {
        if (err) {
            console.error('EJS render error:', err);
            return res.status(500).send('An error occurred while rendering the EJS template.');
        }

        fs.writeFile(path.join(villasDir, 'test.html'), html, (err) => {
            if (err) {
                console.error('File write error:', err);
                return res.status(500).send('An error occurred while saving the test page.');
            }

            res.send('Test page created successfully.');
        });
    });
});

// Route to fetch all villas
app.get('/api/villas', (req, res) => {
    db.query('SELECT * FROM villa_data', (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Server error');
        } else {
            res.json(results);
        }
    });
});

app.get('/api/search_villas', (req, res) => {
    const keyword = req.query.keyword || '';
    const region = req.query.region || '';
    const location = req.query.location || '';
    const pet_friendly = req.query.pet_friendly || '';
    const senior_citizen_friendly = req.query.senior_citizen_friendly || '';
    const pool = req.query.pool || '';
    const nearbyVillas = req.query.nearbyVillas || '';

    let query = 'SELECT * FROM villa_data WHERE is_published = 1';
    const params = [];

    //search criteria to query
    if (keyword) {
        query += ' AND villa_name LIKE ?';
        params.push(`%${keyword}%`);
    }
    if (region) {
        query += ' AND region = ?';
        params.push(region);
    }
    if (location) {
        query += ' AND location = ?';
        params.push(location);
    }
    if (pet_friendly === 'Yes') {
        query += ' AND pet_friendly = ?';
        params.push('Yes');
    }
    if (senior_citizen_friendly === 'Yes') {
        query += ' AND senior_citizen_friendly = ?';
        params.push('Yes');
    }
    if (pool) {
        query += ' AND pool_config LIKE ?';
        params.push(`%${pool}%`);
    }
    if (nearbyVillas) {
        query += ' AND nearby_villas LIKE ?';
        params.push(`%${nearbyVillas}%`);
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Server error');
        } else {
            res.json(results);
        }
    });
});


// Endpoint to fetch villa counts by region and friendliness
app.get('/villa_counts', (req, res) => {
    const query = `
        SELECT 
            SUM(CASE WHEN region = 'North' THEN 1 ELSE 0 END) AS north,
            SUM(CASE WHEN region = 'South' THEN 1 ELSE 0 END) AS south,
            SUM(CASE WHEN region = 'East' THEN 1 ELSE 0 END) AS east,
            SUM(CASE WHEN region = 'West' THEN 1 ELSE 0 END) AS west,
            SUM(CASE WHEN region = 'International' THEN 1 ELSE 0 END) AS international,
            SUM(CASE WHEN pet_friendly = 'Yes' THEN 1 ELSE 0 END) AS pet_friendly,
            SUM(CASE WHEN senior_citizen_friendly = 'Yes' THEN 1 ELSE 0 END) AS senior_citizen_friendly
        FROM villa_data
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching villa counts:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        res.json(results[0]); 
    });
});


// New Route: Upload SOP
app.post('/upload_sop', upload.single('sopFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No SOP file uploaded.');
    }

    const newFileName = req.file.filename;
    const relativeFilePath = path.join('sop', newFileName).replace(/\\/g, '/'); 

    // Insert file information into the database
    const query = 'INSERT INTO sop_files (filename, file_path) VALUES (?, ?)';
    db.query(query, [newFileName, relativeFilePath], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('An error occurred while saving the file.');
        }
        res.send('SOP file uploaded successfully.');
    });
});


// New Route: Fetch SOPs
app.get('/sops', (req, res) => {
    db.query('SELECT * FROM sop_files', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('An error occurred while fetching SOPs.');
        }
        
        results.forEach(sop => {
            console.log('SOP File Path:', sop.file_path);
        });

        res.json(results);
    });
});


// New Route: Delete SOP
app.delete('/delete_sop/:id', (req, res) => {
    const sopId = req.params.id;
    const query = 'SELECT file_path FROM sop_files WHERE id = ?';

    db.query(query, [sopId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('An error occurred while fetching SOP details.');
        }

        const relativeFilePath = results[0]?.file_path;

        if (relativeFilePath) {
           
            const filePath = path.join(__dirname, relativeFilePath);
            console.log('Attempting to delete file at:', filePath);

            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error('File does not exist:', err);
                    return res.status(404).send('SOP file not found.');
                }

                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error('File delete error:', err);
                        return res.status(500).send('An error occurred while deleting the SOP file.');
                    }

                    db.query('DELETE FROM sop_files WHERE id = ?', [sopId], (err) => {
                        if (err) {
                            console.error('Database delete error:', err);
                            return res.status(500).send('An error occurred while deleting the SOP record.');
                        }

                        res.send('SOP deleted successfully.');
                    });
                });
            });
        } else {
            res.status(404).send('SOP file not found in database.');
        }
    });
});


// Upload Offer
app.post('/upload_offer', upload.single('OfferImage'), (req, res) => {
    const { OfferTitle, OfferDescription, OfferDiscount, ValidUntil } = req.body;
    const imagePath = `/uploads/${req.file.filename}`;
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format as YYYY-MM-DD HH:MM:SS

    const sql = 'INSERT INTO offers (OfferTitle, OfferDescription, OfferDiscount, CreatedAt, ValidUntil, OfferImage) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [OfferTitle, OfferDescription, OfferDiscount, createdAt, ValidUntil, imagePath], (err, result) => {
        if (err) {
            console.error('Error inserting offer into database:', err);
            res.status(500).send('Failed to upload offer.');
        } else {
            res.status(200).send('Offer uploaded successfully.');
        }
    });
});

// Get All Offers
app.get('/offers/', (req, res) => {
    const sql = 'SELECT * FROM offers';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching offers from database:', err);
            res.status(500).send('Failed to fetch offers.');
        } else {
            res.json(results);
        }
    });
});

// Route to get all active offers that are still valid
app.get('/activeoffers', (req, res) => {
    const sql = 'SELECT * FROM offers WHERE IsActive = 1 AND ValidUntil >= NOW()';
    
    db.query(sql, (err, results) => {
      if (err) throw err;
      res.json(results);
    });
  });
  
  

// Delete Offer
app.delete('/delete_offer/:id', (req, res) => {
    const offerId = req.params.id;
    const sql = 'DELETE FROM offers WHERE OfferID = ?';
    db.query(sql, [offerId], (err, result) => {
        if (err) {
            console.error('Error deleting offer from database:', err);
            res.status(500).send('Failed to delete offer.');
        } else {
            res.status(200).send('Offer deleted successfully.');
        }
    });
});

// Route to activate an offer
app.put('/activate_offer/:id', (req, res) => {
    const offerId = req.params.id;
    const sql = 'UPDATE offers SET IsActive = ? WHERE OfferID = ?';
    db.query(sql, [1, offerId], (err, result) => {
      if (err) throw err;
      res.sendStatus(200);
    });
  });
  
  // Route to deactivate an offer
  app.put('/deactivate_offer/:id', (req, res) => {
    const offerId = req.params.id;
    const sql = 'UPDATE offers SET IsActive = ? WHERE OfferID = ?';
    db.query(sql, [0, offerId], (err, result) => {
      if (err) throw err;
      res.sendStatus(200);
    });
  });


// Endpoint to get paginated leaderboard data
app.get('/api/leaderboard', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const entriesPerPage = parseInt(req.query.entriesPerPage) || 5;
    const offset = (page - 1) * entriesPerPage;

    const query = 'SELECT * FROM leaderboard ORDER BY points DESC LIMIT ? OFFSET ?';
    db.query(query, [entriesPerPage, offset], (err, results) => {
        if (err) throw err;

        const countQuery = 'SELECT COUNT(*) as total FROM leaderboard';
        db.query(countQuery, (err, countResults) => {
            if (err) throw err;

            const totalEntries = countResults[0].total;
            const totalPages = Math.ceil(totalEntries / entriesPerPage);

            res.json({
                entries: results,
                totalPages: totalPages,
                currentPage: page,
                entriesPerPage: entriesPerPage
            });
        });
    });
});

// Endpoint to create a new employer or update an existing one
app.post('/api/employers', (req, res) => {
    const { name, points } = req.body;
    db.query('INSERT INTO leaderboard (name, points) VALUES (?, ?)', [name, points], (err, results) => {
        if (err) throw err;
        res.json({ id: results.insertId });
    });
});

app.put('/api/employers/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { name, points } = req.body;
    db.query('UPDATE leaderboard SET name = ?, points = ? WHERE id = ?', [name, points, id], (err) => {
        if (err) throw err;
        res.json({ message: 'Updated successfully' });
    });
});

// Endpoint to delete an employer
app.delete('/api/employers/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    db.query('DELETE FROM leaderboard WHERE id = ?', [id], (err) => {
        if (err) throw err;
        res.json({ message: 'Deleted successfully' });
    });
});

// Endpoint to get all employers
app.get('/api/employers', (req, res) => {
    db.query('SELECT * FROM leaderboard', (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Endpoint to get a single employer by ID
app.get('/api/employers/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    db.query('SELECT * FROM leaderboard WHERE id = ?', [id], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ message: 'Employer not found' });
        }
    });
});
// Add New Format
app.post('/upload_format', upload.single('formatFile'), (req, res) => {
    const { type, name } = req.body;
    const filePath = `/uploads/${req.file.filename}`;
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const sql = 'INSERT INTO formats (type, name, filename, created_at, file_path) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [type, name, req.file.filename, createdAt, filePath], (err) => {
        if (err) {
            console.error('Error inserting format into database:', err);
            res.status(500).send('Failed to upload format.');
        } else {
            res.status(200).send('Format uploaded successfully.');
        }
    });
});

// Delete Format
app.delete('/delete_format/:id', (req, res) => {
    const formatId = req.params.id;
    const query = 'SELECT filename FROM formats WHERE id = ?';

    db.query(query, [formatId], (err, results) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).send('An error occurred while fetching format details.');
        }

        if (results.length === 0) {
            return res.status(404).send('Format not found.');
        }

        const filename = results[0].filename;
        const filePath = path.join(formatsDir, filename);

        fs.access(filePath, fs.constants.F_OK, err => {
            if (err) {
                console.error('File access error:', err.message);
                return res.status(404).send('Format file not found.');
            }

            fs.unlink(filePath, err => {
                if (err) {
                    console.error('File delete error:', err.message);
                    return res.status(500).send('An error occurred while deleting the format file.');
                }

                db.query('DELETE FROM formats WHERE id = ?', [formatId], err => {
                    if (err) {
                        console.error('Database delete error:', err.message);
                        return res.status(500).send('An error occurred while deleting the format record.');
                    }

                    res.send('Format deleted successfully.');
                });
            });
        });
    });
});


// Fetch All Formats
app.get('/formats', (req, res) => {
    db.query('SELECT * FROM formats', (err, results) => {
        if (err) {
            console.error('Error fetching formats from database:', err);
            res.status(500).send('Failed to fetch formats.');
        } else {
            res.json(results);
        }
    });
});

// Fetch Single Format
app.get('/formats/:id', (req, res) => {
    const formatId = req.params.id;
    db.query('SELECT * FROM formats WHERE id = ?', [formatId], (err, results) => {
        if (err) {
            console.error('Error fetching format from database:', err);
            res.status(500).send('Failed to fetch format.');
        } else if (results.length === 0) {
            res.status(404).send('Format not found.');
        } else {
            res.json(results[0]);
        }
    });
});

// Endpoint to publish/unpublish a villa
app.put('/villas/:id/publish', (req, res) => {
    const villaId = req.params.id;
    const isPublished = req.body.isPublished;
  
    db.query(
      'UPDATE villa_data SET is_published = ? WHERE id = ?',
      [isPublished, villaId],
      (error, results) => {
        if (error) {
          return res.status(500).json({ message: 'Error updating villa status' });
        }
        res.status(200).json({ message: 'Villa status updated successfully' });
      }
    );
  });

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard.html');
        }
        res.clearCookie('connect.sid'); 
        res.redirect('/index.html');
    });
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
