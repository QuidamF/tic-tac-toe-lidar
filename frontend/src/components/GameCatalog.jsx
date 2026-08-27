import React from "react";
import "./GameCatalog.css"; // Opcional: puedes crear este archivo para los estilos

const GameCatalog = () => {
  // Aquí puedes agregar la lógica y los datos de tu catálogo de juegos
  const games = [
    { id: 1, title: "Gato (Tic-Tac-Toe)", description: "Juego clásico interactivo con LiDAR." },
    // Agrega más juegos aquí
  ];

  return (
    <div className="game-catalog-container">
      <h2>Catálogo de Juegos</h2>
      <div className="game-list">
        {games.map((game) => (
          <div key={game.id} className="game-card">
            <h3>{game.title}</h3>
            <p>{game.description}</p>
            <button className="play-button">Jugar</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameCatalog;
