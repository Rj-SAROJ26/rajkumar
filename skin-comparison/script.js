// Dummy data generator
function getDummyResults(filename) {
    const diseases = [
        {name: "Eczema", symptoms: "Redness, itching, dry patches", cnn: 75, resnet: 88},
        {name: "Psoriasis", symptoms: "Scaly skin, itching, inflammation", cnn: 82, resnet: 91},
        {name: "Acne", symptoms: "Pimples, blackheads, oily skin", cnn: 70, resnet: 85},
    ];
    // pick random
    return diseases[Math.floor(Math.random() * diseases.length)];
}

function createCard(imageSrc, results) {
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = results.name;
    card.appendChild(img);

    const content = document.createElement('div');
    content.className = 'card-content';

    const table = document.createElement('table');
    table.innerHTML = `
        <tr><th>Disease</th><td>${results.name}</td></tr>
        <tr><th>Symptoms</th><td>${results.symptoms}</td></tr>
        <tr><th>CNN Accuracy</th><td>${results.cnn}%</td></tr>
        <tr><th>ResNet Accuracy</th><td>${results.resnet}%</td></tr>
    `;
    content.appendChild(table);

    const bars = document.createElement('div');
    bars.className = 'accuracy-bars';

    const cnnContainer = document.createElement('div');
    cnnContainer.className = 'bar-container';
    const cnnBar = document.createElement('div');
    cnnBar.className = 'bar-cnn';
    cnnBar.style.width = results.cnn + '%';
    cnnContainer.appendChild(cnnBar);
    const cnnLabel = document.createElement('span');
    cnnLabel.className = 'bar-label';
    cnnLabel.textContent = 'CNN';
    cnnContainer.appendChild(cnnLabel);

    const resnetContainer = document.createElement('div');
    resnetContainer.className = 'bar-container';
    const resnetBar = document.createElement('div');
    resnetBar.className = 'bar-resnet';
    resnetBar.style.width = results.resnet + '%';
    resnetContainer.appendChild(resnetBar);
    const resnetLabel = document.createElement('span');
    resnetLabel.className = 'bar-label';
    resnetLabel.textContent = 'ResNet';
    resnetContainer.appendChild(resnetLabel);

    bars.appendChild(cnnContainer);
    bars.appendChild(resnetContainer);
    content.appendChild(bars);

    card.appendChild(content);
    return card;
}

function handleFiles(files) {
    const resultsSection = document.getElementById('results');
    resultsSection.innerHTML = '';

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dummy = getDummyResults(file.name);
            const card = createCard(e.target.result, dummy);
            resultsSection.appendChild(card);
        };
        reader.readAsDataURL(file);
    });
}

const uploadInput = document.getElementById('imageUpload');
uploadInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});
