export const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

export const findBestMatch = (source, targets, threshold = 0.5) => {
    let bestMatch = null;
    let maxScore = -Infinity;
    const lowerSource = source.toLowerCase();

    targets.forEach(target => {
        const lowerTarget = target.toLowerCase();
        const distance = levenshteinDistance(lowerSource, lowerTarget);

        const maxLen = Math.max(source.length, target.length);
        if (maxLen === 0) return; // Should not happen for non-empty strings

        // Base score: 1.0 is exact match, 0.0 is completely different (theoretically)
        let score = 1.0 - (distance / maxLen);

        // Bonus for substring match (e.g. "Area" -> "store_area")
        if (lowerTarget.includes(lowerSource) || lowerSource.includes(lowerTarget)) {
            score += 0.4; // Significant bonus
        }

        // Bonus for token match (e.g. "user_id" -> "id") - simple check
        // If one is contained in the other, we already gave bonus.
        // Let's stick to substring bonus for now as it covers "Area" -> "store_area"

        if (score >= threshold && score > maxScore) {
            maxScore = score;
            bestMatch = target;
        }
    });

    return bestMatch;
};
