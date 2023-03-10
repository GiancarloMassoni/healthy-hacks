/* eslint-disable camelcase */
import React from 'react';
import AppContext from '../lib/app-context';

export default class MenuPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      restaurantItems: [],
      favMeals: [],
      favRestaurants: [],
      currUser: null
    };
    this.addedFavRestaurant = this.addedFavRestaurant.bind(this);
  }

  addedFavRestaurant() {
    const { brand_name } = this.state.restaurantItems[0];
    const { userId } = this.context.user;
    if (!this.state.favRestaurants.includes(brand_name)) {

      fetch('/api/restaurants', {
        method: 'POST',
        body: JSON.stringify({
          restaurant: this.props.menuId,
          currUser: userId
        }),
        headers: {
          'Content-Type': 'application/json'
        }

      })
        .then(res => res.json())
        .then(data => {
          const newRestaurants = this.state.favRestaurants.concat(this.props.menuId);
          this.setState({ favRestaurants: newRestaurants });
        })
        .catch(err => console.error('Fetch failed!', err))
      ;
    } else if (this.state.favRestaurants.includes(brand_name)) {
      fetch(`/api/restaurants/${userId}`, {
        method: 'DELETE',
        body: JSON.stringify({ restaurant: brand_name }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(res => res)
        .then(data => {
          const newRestaurants = this.state.favRestaurants.filter(el => el !== brand_name);
          this.setState({ favRestaurants: newRestaurants });
        })
        .catch(err => console.error('Delete failed!', err))
      ;
    }

  }

  addedFavMeal(meal) {
    const mealName = meal.food_name;
    const servingSize = meal.serving_weight_grams;
    const calories = meal.nf_calories;
    const protein = meal.full_nutrients[0].value;
    const fat = meal.full_nutrients[1].value;
    const carbohydrates = meal.full_nutrients[2].value;
    const img = meal.photo.thumb;
    const { userId } = this.context.user;
    if (!this.state.favMeals.includes(mealName)) {
      fetch('/api/meals', {
        method: 'POST',
        body: JSON.stringify(
          {
            userId,
            mealName,
            servingSize,
            calories,
            protein,
            fat,
            carbohydrates,
            restaurantName: this.props.menuId,
            img
          }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(res => res.json())
        .then(data => {
          const newMeals = this.state.favMeals.concat(mealName);
          this.setState({ favMeals: newMeals });

        })
        .catch(err => console.error('Fetch failed!', err));
    } else if (this.state.favMeals.includes(mealName)) {
      fetch(`/api/meals/${userId}`, {
        method: 'DELETE',
        body: JSON.stringify({ mealName }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(res => res)
        .then(data => {
          const newMeals = this.state.favMeals.filter(el => el !== mealName);
          this.setState({ favMeals: newMeals });
        })
        .catch(err => console.error('Delete failed!', err))
      ;
    }
  }

  favButtonRestaurant() {
    if (this.state.currUser === null) return;
    if (!this.state.favRestaurants.includes(this.props.menuId)) {
      return <button className='fav-btn' onClick={this.addedFavRestaurant}>Favorite</button>;
    } else {
      return <button className='fav-btn-on' onClick={this.addedFavRestaurant}>Favorited</button>;
    }
  }

  favButtonMeal(food) {
    if (this.state.currUser === null) return;
    if (this.state.favMeals.includes(food.food_name)) {
      return <button className='fav-btn-on-meal' onClick={event => this.addedFavMeal(food)}>Favorited</button>;
    } else {
      return <button className='fav-btn-meal' onClick={event => this.addedFavMeal(food)}>Favorite</button>;
    }
  }

  componentDidMount() {
    if (this.context.user !== null) {
      this.setState({ currUser: this.context.user });
      const { userId } = this.context.user;
      fetch(`/api/restaurants/${userId}`, {
        method: 'GET'
      })
        .then(res => res.json())
        .then(data => {
          const newRestaurants = data.map(res => res.restaurantName);
          this.setState({ favRestaurants: newRestaurants });
        })
      // eslint-disable-next-line no-console
        .catch(err => console.log('Fetch Get Error', err));

      fetch(`/api/meals/${userId}`, {
        method: 'GET'
      })
        .then(res => res.json())
        .then(data => {
          const newMeals = data.map(res => res.mealName);
          this.setState({ favMeals: newMeals });
        })
      // eslint-disable-next-line no-console
        .catch(err => console.log('Fetch Get Error', err));
    }
    fetch(`https://trackapi.nutritionix.com/v2/search/instant/?query=${this.props.menuId}&detailed=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-app-id': process.env.REACT_APP_X_ID_API_KEY,
        'x-app-key': process.env.REACT_APP_X_KEY_API_KEY
      }

    })
      .then(res => res.json())
      .then(data => {
        this.setState({ restaurantItems: data.branded });

      })
      // eslint-disable-next-line no-console
      .catch(err => console.log('Fetch Get error:', err));
  }

  renderItems() {

    const mappedItems = (item, index) => {
      if (item.nf_calories > 500) {
        return;
      }

      if (item.serving_weight_grams === null) {
        item.serving_weight_grams = 1;
        return <div key={index} className='col-half'>
          <div className='row border'>
            <div className='col-full'>
              <h2 className='text-center'>{item.food_name}</h2>
            </div>
            <div className='col-half'>
              <img src={item.photo.thumb} alt="" />
            </div>
            <div className='col-half'>
              <div className="text-right">
                {this.favButtonMeal(item)}
              </div>
              <p className='cal-table'>Serving Size {item.serving_weight_grams}</p>
              <p className='cal-table'> Calories {item.nf_calories}</p>
              <p className='cal-table'>Protein {item.full_nutrients[0].value}g</p>
              <p className='cal-table'>Fat {item.full_nutrients[1].value}g</p>
              <p className='cal-table'>Carbohydrates {item.full_nutrients[2].value}g</p>
            </div>
          </div>
        </div>;
      }

      if (index % 2 === 0) {
        return <div key={index} className='col-half'>
          <div className='row border'>
            <div className='col-full'>
              <h2 className='text-center'>{item.food_name}</h2>
            </div>
            <div className='col-half'>
              <img src={item.photo.thumb} alt="" />
            </div>
            <div className='col-half'>
              <div className="text-right">
                {this.favButtonMeal(item)}
              </div>
              <p className='cal-table'>Serving Size {item.serving_weight_grams} grams</p>
              <p className='cal-table'> Calories {item.nf_calories}</p>
              <p className='cal-table'>Protein {item.full_nutrients[0].value}g</p>
              <p className='cal-table'>Fat {item.full_nutrients[1].value}g</p>
              <p className='cal-table'>Carbohydrates {item.full_nutrients[2].value}g</p>
            </div>
          </div>
        </div>
        ;
      } else {
        return <div key={index} className='col-half'>
          <div className='row border' >
            <div className='col-full'>
              <h2 className='text-center'>{item.food_name}</h2>
            </div>
            <div className='col-half'>
              <img src={item.photo.thumb} alt="" />
            </div>
            <div className='col-half'>
              {this.favButtonMeal(item)}
              <p className='cal-table'>Serving Size {item.serving_weight_grams} grams</p>
              <p className='cal-table'> Calories {item.nf_calories}</p>
              <p className='cal-table'>Protein {item.full_nutrients[0].value}g</p>
              <p className='cal-table'>Fat {item.full_nutrients[1].value}g</p>
              <p className='cal-table'>Carbohydrates {item.full_nutrients[2].value}g</p>
            </div>
          </div>
        </div>
        ;
      }
    };

    const items = this.state.restaurantItems.map(mappedItems);
    return items;
  }

  render() {
    return (
      <div className='row'>
        <div className='col-full text-center'>
          <h1 className='menu-id'> {this.props.menuId}</h1>
          <h2>Menu Items under 500 Calories</h2>
          <h2>All calories per serving size</h2>
          {this.favButtonRestaurant()}
        </div>
        <div className='row'>
          {this.renderItems()}
        </div>
      </div>
    );
  }
}

MenuPage.contextType = AppContext;
