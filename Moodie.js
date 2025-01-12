const TMDB_API_KEY = '07dd3e77900700188c92526d94c88070';

async function getMoviesByGenre(genreId, language) {
    const url = new URL(`https://api.themoviedb.org/3/discover/movie`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('with_genres', genreId);
    url.searchParams.append('sort_by', 'popularity.desc');
    if (language) url.searchParams.append('with_original_language', language);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error fetching data: ${response.statusText}`);
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function getGenreId(genreName) {
    const url = new URL(`https://api.themoviedb.org/3/genre/movie/list`);
    url.searchParams.append('api_key', TMDB_API_KEY);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error fetching genres: ${response.statusText}`);
        const data = await response.json();
        const genres = data.genres;

        const genre = genres.find(genre => genre.name.toLowerCase() === genreName.toLowerCase());
        return genre ? genre.id : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getMovieDetails(movieId) {
    const url = new URL(`https://api.themoviedb.org/3/movie/${movieId}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('append_to_response', 'credits');

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error fetching movie details: ${response.statusText}`);
        const data = await response.json();
        const cast = data.credits.cast.slice(0, 5).map(actor => actor.name).join(', ');
        return {
            tagline: data.tagline,
            posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'default-poster.jpg',
            rating: data.vote_average,
            genre: data.genres.map(genre => genre.name).join(', '),
            director: data.credits.crew.find(crewMember => crewMember.job === 'Director')?.name || 'N/A',
            releaseDate: data.release_date,
            description: data.overview,
            cast: cast
        };
    } catch (error) {
        console.error(error);
        return {};
    }
}

async function getTrailerUrl(movieId) {
    const url = new URL(`https://api.themoviedb.org/3/movie/${movieId}/videos`);
    url.searchParams.append('api_key', TMDB_API_KEY);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error fetching trailer: ${response.statusText}`);
        const data = await response.json();
        const trailers = data.results.filter(video => video.type === 'Trailer' && video.site === 'YouTube');
        
        if (trailers.length === 0) {
            console.warn(`No trailers found for movie ID ${movieId}`);
            return null;
        }
        
        return `https://www.youtube.com/embed/${trailers[0].key}?autoplay=1`;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function suggestMoviesByMood(mood, language) {
    const moodGenres = {
        'happy': 'Comedy',
        'sad': 'Drama',
        'excited': 'Action',
        'romantic': 'Romance',
        'aderanaline rush': 'Horror',
        'relax': 'Family',
        'bored': 'Animation',
        'angry': 'Thriller',
        'adventurous': 'Adventure',
        'nostalgic': 'Documentary',
        'mystery': 'Mystery',
        'serious': 'War',
        'inspired': 'Biography',
        // '18+' : 'erotic',
       
    };

    const genreName = moodGenres[mood.toLowerCase()];
    if (!genreName) {
        return "Sorry, I don't have suggestions for that mood.";
    }

    const genreId = await getGenreId(genreName);
    if (!genreId) {
        return "Sorry, I couldn't find any movies for that genre.";
    }

    const movies = await getMoviesByGenre(genreId, language);
    const suggestions = await Promise.all(movies.slice(0, 30).map(async (movie) => {
        const movieDetails = await getMovieDetails(movie.id);
        const trailerUrl = await getTrailerUrl(movie.id);
        return {
            title: movie.title,
            tagline: movieDetails.tagline,
            trailerUrl: trailerUrl,
            posterUrl: movieDetails.posterUrl,
            rating: movieDetails.rating,
            genre: movieDetails.genre,
            director: movieDetails.director,
            releaseDate: movieDetails.releaseDate,
            description: movieDetails.description,
            cast: movieDetails.cast
        };
    }));

    return suggestions;
}

document.getElementById("submit").addEventListener("click", async function () {
    const mood = document.getElementById("mood").value.trim();
    const language = document.getElementById("language").value;
    const suggestionsDiv = document.getElementById("suggestions");
    const overlay = document.getElementById("overlay");
    const trailerFrame = document.getElementById("trailerFrame");

    const suggestions = await suggestMoviesByMood(mood, language);

    suggestionsDiv.innerHTML = '';
    overlay.style.display = 'none'; // Hide the overlay initially

    if (Array.isArray(suggestions) && suggestions.length > 0) {
        suggestionsDiv.innerHTML = "<h2>Here are some movie suggestions for you:</h2>";
        suggestions.forEach((movie, index) => {
            suggestionsDiv.innerHTML += `
                <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
                    <div class="movie-poster-container" 
                        onclick="playTrailer('${movie.trailerUrl}', '${movie.posterUrl}')" 
                        onmouseover="changeBackground('${movie.posterUrl}')" 
                        onmouseout="resetBackground()">
                        <img src="${movie.posterUrl}" alt="${movie.title} poster" style="width: 200px; height: auto; border-radius: 8px;">
                        <div class="play-button"></div>
                    </div>
                    <div style="margin-left: 20px;">
                        <h3>${index + 1}. ${movie.title}</h3>
                        <p><strong>Rating:</strong> ⭐${movie.rating} / 10</p>
                        <p><strong>Genre:</strong> ${movie.genre}</p>
                        <p><strong>Director:</strong> ${movie.director}</p>
                        <p><strong>Release Date:</strong> ${movie.releaseDate}</p>
                        <p><strong>Cast:</strong> ${movie.cast}</p>
                        <p><strong>Description:</strong> ${movie.description}</p>
                        <p><strong>Where to Watch:</strong> ${movie.whereToWatch || 'N/A'}</p>
                    </div>
                </div>
                <hr>`;
        });
    } else {
        suggestionsDiv.innerHTML = `<p>${suggestions}</p>`;
    }
});

function playTrailer(trailerUrl, posterUrl) {
    const overlay = document.getElementById("overlay");
    const trailerFrame = document.getElementById("trailerFrame");
    const backgroundPoster = document.getElementById("backgroundPoster");
    if (trailerUrl) {
        trailerFrame.src = trailerUrl;
        overlay.style.display = 'flex';
        backgroundPoster.style.backgroundImage = `url('${posterUrl}')`; // Set background image
        backgroundPoster.style.display = 'block'; // Show background poster
    } else {
        console.warn("No trailer available for this movie.");
        alert("Trailer not available for this movie.");
    }
}

function changeBackground(posterUrl) {
    const backgroundPoster = document.getElementById("backgroundPoster");
    backgroundPoster.style.backgroundImage = `url('${posterUrl}')`; // Change background on hover
    backgroundPoster.style.display = 'block'; // Ensure it is displayed
}

function resetBackground() {
    const backgroundPoster = document.getElementById("backgroundPoster");
    backgroundPoster.style.display = 'none'; // Hide background poster
}

document.getElementById("closeButton").addEventListener("click", function () {
    const overlay = document.getElementById("overlay");
    const trailerFrame = document.getElementById("trailerFrame");
    const backgroundPoster = document.getElementById("backgroundPoster");
    trailerFrame.src = '';
    overlay.style.display = 'none';
    backgroundPoster.style.display = 'none'; // Hide background poster when trailer is closed
});
