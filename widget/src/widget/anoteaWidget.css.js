const style = `
.anotea-widget {
    font-family: 'Lato';
    border: 1px black solid;
    padding: 20px 0px 20px 0px;
    width: fit-content;
}

.col1, .col2 {
    display: inline-block;
}

.col1 {

}

.verified, .propulsed {
    color: rgba(36, 48, 58, 0.6);
    font-size: 0.8em;
    font-weight: normal;
    text-align: center;
    margin-top: 10px;
}

.verified img, .propulsed img {
    height: 26px;
}

h1.title {
	color: #000000;
	font-size: 18px;
	font-weight: bold;
	line-height: 22px;
    text-align: center;
    margin: 0;
}

.score {
    margin-top: 20px;
}

.average {
    background-color: #F4F4F5;
    padding: 20px;
    margin: 10px;
}

.average .rate {
	color: #24303A;
	font-size: 1.7em;
	font-weight: 900;
	line-height: 35px;
}

.average .total {
	color: #91979C; 
	font-size: 0.85em;
	font-weight: 900;
    line-height: 29px;
    font-weight: normal;
}
.average .fas.fa-star.active {
    font-size: 0.6em;
}

.avis-count {
	height: 20px;
	width: 90px;
	color: rgba(36, 48, 58, 0.6);
	font-size: 0.8em;
	line-height: 20px;
    text-align: right;
    float: right;
    line-height: 46px;
    font-weight: normal;
}

.notes {
	color: #91979C;
	font-size: 16px;
    line-height: 28px;
    text-align: left;
    padding: 0px;
    list-style: none;
    margin-left: 15px;
}

.notes .label {
    width: 150px;
    display: inline-block;
}

@media screen and (max-width: 600px) {
    .notes {
        display: none;
    }
}
`;
export default style;